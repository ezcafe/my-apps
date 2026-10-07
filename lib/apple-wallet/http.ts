import { NextResponse } from "next/server";
import {
  badRequest,
  forbidden,
  rateLimited,
  unauthorized,
} from "@/lib/api-http";
import type { AppleWalletConfig } from "@/lib/apple-wallet/config";
import {
  AppleIssueTokenError,
  issueApplePass,
  mintAppleIssueToken,
  redeemAppleIssueToken,
} from "@/lib/apple-wallet/issue";
import type { BuildApplePassArgs } from "@/lib/apple-wallet/pass";
import type { AppleWalletStore } from "@/lib/apple-wallet/store";
import type { AppleWebService } from "@/lib/apple-wallet/webservice";
import { APPLE_WALLET_PKPASS_FILENAME } from "@/lib/apple-wallet/constants";
import { readJsonBounded } from "@/lib/request-guards";
import { appleWalletWorkspaceBodySchema } from "@/lib/validators/apple-wallet";

export type AppleWalletHttpDeps = {
  isAppleWalletEnabled: () => boolean;
  getConfig: () => AppleWalletConfig | null;
  store: AppleWalletStore;
  resolveSessionUserSub: () => Promise<string | null>;
  resolveBabyWorkspaceId: (
    userSub: string,
    workspaceId?: string | null,
  ) => Promise<string | null>;
  assertBabyMember: (
    userSub: string,
    workspaceId: string,
  ) => Promise<boolean>;
  enforceRateLimit: (args: {
    name: string;
    request: Request;
    userKey?: string | null;
    points: number;
    durationSeconds: number;
  }) => Promise<boolean>;
  assertSameOriginStrict: (req: Request) => boolean;
  publicOrigin: () => string;
  webservice: () => AppleWebService;
  issueRpm: () => number;
  mintRpm: () => number;
  /** PassKit /log RPM (IP / anon principal). */
  logRpm: () => number;
  /** Override pass signing (tests inject a fake buffer). */
  buildPass?: (args: BuildApplePassArgs) => Promise<Buffer>;
};

async function readWorkspaceBody(
  req: Request,
): Promise<{ ok: true; workspaceId?: string } | { ok: false; response: Response }> {
  let body: unknown = {};
  try {
    body = await readJsonBounded(
      req,
      Number(process.env.JSON_MAX_BYTES ?? 262144),
    );
  } catch {
    const len = Number(req.headers.get("content-length") ?? "0");
    if (len > 0) {
      return { ok: false, response: await badRequest("Invalid JSON") };
    }
    body = {};
  }

  const parsed = appleWalletWorkspaceBodySchema.safeParse(body ?? {});
  if (!parsed.success) {
    return {
      ok: false,
      response: await badRequest(
        parsed.error.issues.map((i) => i.message).join("; ") ||
          "Validation failed",
      ),
    };
  }
  return { ok: true, workspaceId: parsed.data.workspaceId };
}

function appleDisabled() {
  return NextResponse.json(
    { error: "Apple Wallet is not configured", code: "apple_disabled" },
    { status: 404 },
  );
}

function pkpassResponse(buffer: Buffer) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": `attachment; filename="${APPLE_WALLET_PKPASS_FILENAME}"`,
      "Cache-Control": "no-store",
    },
  });
}

function wsToResponse(res: {
  status: number;
  body?: string | Buffer;
  headers?: Record<string, string>;
}) {
  if (res.status === 204 || res.status === 304) {
    return new NextResponse(null, {
      status: res.status,
      headers: res.headers,
    });
  }
  if (Buffer.isBuffer(res.body)) {
    return new NextResponse(new Uint8Array(res.body), {
      status: res.status,
      headers: res.headers,
    });
  }
  return new NextResponse(res.body ?? null, {
    status: res.status,
    headers: res.headers,
  });
}

export async function handleIssueGet(
  req: Request,
  deps: AppleWalletHttpDeps,
): Promise<Response> {
  if (!deps.isAppleWalletEnabled()) return appleDisabled();
  const config = deps.getConfig();
  if (!config) return appleDisabled();

  const url = new URL(req.url);
  const token = url.searchParams.get("t");

  if (token) {
    const allowed = await deps.enforceRateLimit({
      name: "apple-wallet:issue-redeem",
      request: req,
      userKey: null,
      points: deps.issueRpm(),
      durationSeconds: 60,
    });
    if (!allowed) return rateLimited();

    try {
      const issued = await redeemAppleIssueToken(token, {
        store: deps.store,
        config,
        buildPass: deps.buildPass,
      });
      return pkpassResponse(issued.buffer);
    } catch (e) {
      if (e instanceof AppleIssueTokenError) {
        const status = e.code === "gone" ? 410 : 401;
        return NextResponse.json(
          { error: e.message, code: e.code === "gone" ? "gone" : "unauthorized" },
          { status },
        );
      }
      throw e;
    }
  }

  const userSub = await deps.resolveSessionUserSub();
  if (!userSub) return unauthorized();

  const allowed = await deps.enforceRateLimit({
    name: "apple-wallet:issue",
    request: req,
    userKey: userSub,
    points: deps.issueRpm(),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  const workspaceIdParam = url.searchParams.get("workspaceId");
  const workspaceId = await deps.resolveBabyWorkspaceId(
    userSub,
    workspaceIdParam,
  );
  if (!workspaceId) return forbidden();
  const member = await deps.assertBabyMember(userSub, workspaceId);
  if (!member) return forbidden();

  const issued = await issueApplePass(workspaceId, userSub, {
    store: deps.store,
    config,
    buildPass: deps.buildPass,
  });
  return pkpassResponse(issued.buffer);
}

export async function handleIssueTokenPost(
  req: Request,
  deps: AppleWalletHttpDeps,
): Promise<Response> {
  if (!deps.isAppleWalletEnabled()) return appleDisabled();

  const userSub = await deps.resolveSessionUserSub();
  if (!userSub) return unauthorized();

  const allowed = await deps.enforceRateLimit({
    name: "apple-wallet:mint",
    request: req,
    userKey: userSub,
    points: deps.mintRpm(),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  if (!deps.assertSameOriginStrict(req)) {
    return badRequest("Cross-origin request blocked");
  }

  const parsedBody = await readWorkspaceBody(req);
  if (!parsedBody.ok) return parsedBody.response;

  const workspaceId = await deps.resolveBabyWorkspaceId(
    userSub,
    parsedBody.workspaceId,
  );
  if (!workspaceId) return forbidden();
  const member = await deps.assertBabyMember(userSub, workspaceId);
  if (!member) return forbidden();

  const minted = await mintAppleIssueToken(workspaceId, userSub, {
    store: deps.store,
    publicOrigin: deps.publicOrigin,
  });
  return NextResponse.json(
    { data: { url: minted.url, expiresAt: minted.expiresAt } },
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}

export async function handleSubscriptionDelete(
  req: Request,
  deps: AppleWalletHttpDeps,
): Promise<Response> {
  if (!deps.isAppleWalletEnabled()) return appleDisabled();

  const userSub = await deps.resolveSessionUserSub();
  if (!userSub) return unauthorized();

  const allowed = await deps.enforceRateLimit({
    name: "apple-wallet:unlink",
    request: req,
    userKey: userSub,
    points: deps.mintRpm(),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  if (!deps.assertSameOriginStrict(req)) {
    return badRequest("Cross-origin request blocked");
  }

  const parsedBody = await readWorkspaceBody(req);
  if (!parsedBody.ok) return parsedBody.response;

  const workspaceId = await deps.resolveBabyWorkspaceId(
    userSub,
    parsedBody.workspaceId,
  );
  if (!workspaceId) return forbidden();
  const member = await deps.assertBabyMember(userSub, workspaceId);
  if (!member) return forbidden();

  await deps.store.softUnlink(workspaceId, userSub, new Date());
  return new NextResponse(null, { status: 204 });
}

export async function handlePassKitRegister(
  req: Request,
  params: {
    deviceLibraryId: string;
    passTypeId: string;
    serialNumber: string;
  },
  deps: AppleWalletHttpDeps,
): Promise<Response> {
  if (!deps.isAppleWalletEnabled()) return appleDisabled();
  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const res = await deps.webservice().register({
    ...params,
    authorization: req.headers.get("authorization"),
    body,
  });
  return wsToResponse(res);
}

export async function handlePassKitUnregister(
  req: Request,
  params: {
    deviceLibraryId: string;
    passTypeId: string;
    serialNumber: string;
  },
  deps: AppleWalletHttpDeps,
): Promise<Response> {
  if (!deps.isAppleWalletEnabled()) return appleDisabled();
  const res = await deps.webservice().unregister({
    ...params,
    authorization: req.headers.get("authorization"),
  });
  return wsToResponse(res);
}

export async function handlePassKitListUpdated(
  req: Request,
  params: { deviceLibraryId: string; passTypeId: string },
  deps: AppleWalletHttpDeps,
): Promise<Response> {
  if (!deps.isAppleWalletEnabled()) return appleDisabled();
  const url = new URL(req.url);
  const res = await deps.webservice().listUpdated({
    ...params,
    passesUpdatedSince: url.searchParams.get("passesUpdatedSince"),
  });
  return wsToResponse(res);
}

export async function handlePassKitGetPass(
  req: Request,
  params: { passTypeId: string; serialNumber: string },
  deps: AppleWalletHttpDeps,
): Promise<Response> {
  if (!deps.isAppleWalletEnabled()) return appleDisabled();
  const res = await deps.webservice().getPass({
    ...params,
    authorization: req.headers.get("authorization"),
    ifModifiedSince: req.headers.get("if-modified-since"),
  });
  return wsToResponse(res);
}

export async function handlePassKitLog(
  req: Request,
  deps: AppleWalletHttpDeps,
): Promise<Response> {
  if (!deps.isAppleWalletEnabled()) return appleDisabled();
  const allowed = await deps.enforceRateLimit({
    name: "apple-wallet:passkit-log",
    request: req,
    userKey: null,
    points: deps.logRpm(),
    durationSeconds: 60,
  });
  if (!allowed) return rateLimited();

  let body: unknown = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }
  const res = await deps.webservice().log(body);
  return wsToResponse(res);
}
