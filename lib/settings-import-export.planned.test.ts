/**
 * Planned tests for settings Import/Export (workflow 20261024-settings-import-export).
 * Iron law: these names match 04-tasks.md Planned tests — keep green after Build.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  BABY_SETTINGS_CATEGORIES,
  filterSettingsCategories,
  INVESTMENT_SETTINGS_CATEGORIES,
  LOANS_SETTINGS_CATEGORIES,
  MONEY_SETTINGS_CATEGORIES,
} from "@/components/settings/settings-types";
import {
  isMoneyImportKind,
  moneyImportFieldDefs,
  type MoneyImportKind,
} from "@/lib/money-import-kinds";

const root = process.cwd();

describe("settings import-export Planned", () => {
  it("MONEY_SETTINGS_CATEGORIES includes import-export category", () => {
    const cat = MONEY_SETTINGS_CATEGORIES.find((c) => c.id === "import-export");
    assert.ok(cat, "expected import-export category on Money settings");
    assert.match(cat.label.toLowerCase(), /import|export/);
    assert.ok(cat.keywords.some((k) => /import|export|csv/i.test(k)));
  });

  it("BABY_LOANS_INVESTMENT_SETTINGS include import-export category", () => {
    for (const [name, cats] of [
      ["Baby", BABY_SETTINGS_CATEGORIES],
      ["Loans", LOANS_SETTINGS_CATEGORIES],
      ["Investment", INVESTMENT_SETTINGS_CATEGORIES],
    ] as const) {
      const cat = cats.find((c) => c.id === "import-export");
      assert.ok(cat, `${name} settings missing import-export category`);
      assert.ok(
        cat.keywords.some((k) => /import|export|csv/i.test(k)),
        `${name} import-export keywords should include import/export/csv`,
      );
    }
  });

  it("moneyChildSettings deepLink import and export for accounts", () => {
    const src = readFileSync(
      join(root, "components/money-settings/money-settings-accounts.tsx"),
      "utf8",
    );
    assert.match(src, /\/money\/import\/accounts/);
    assert.match(
      src,
      /\/api\/money\/export\/accounts|moneyExport|Export/,
      "accounts child settings should deep-link Export for accounts",
    );
  });

  it("filterSettingsCategories import finds import-export", () => {
    const { matchingCategories } = filterSettingsCategories(
      "import",
      MONEY_SETTINGS_CATEGORIES,
    );
    assert.ok(
      matchingCategories.some((c) => c.id === "import-export"),
      "search 'import' should find Money import-export",
    );
  });

  it("moneyExportCsv accounts headers match moneyImportFieldDefs keys", async () => {
    const { moneyExportCsv } = await import("@/lib/money-export");
    const defs = moneyImportFieldDefs("accounts");
    const expectedHeaders = defs.map((d) => d.key);
    const csv = moneyExportCsv("accounts", [
      {
        name: "Cash",
        type: "cash",
        currency: "USD",
        institution: "",
        balanceMinor: 0,
        sortOrder: 0,
        archived: false,
      },
    ]);
    const headerLine = csv.split("\n")[0] ?? "";
    const headers = headerLine.split(",").map((h) => h.trim());
    assert.deepEqual(headers, expectedHeaders);
  });

  it("moneyExport rejects non MoneyImportKind", async () => {
    const { moneyExportCsv, isExportableMoneyKind } = await import(
      "@/lib/money-export"
    );
    assert.equal(isMoneyImportKind("not-a-kind"), false);
    assert.equal(isExportableMoneyKind("not-a-kind"), false);
    assert.throws(
      () => moneyExportCsv("not-a-kind" as MoneyImportKind, []),
      /kind|invalid|unknown/i,
    );
  });

  it("moneyExportGet returns 413 export_too_large when over cap", async () => {
    const { buildMoneyExportResponse, MONEY_EXPORT_MAX_ROWS } = await import(
      "@/lib/money-export"
    );
    const rows = Array.from({ length: MONEY_EXPORT_MAX_ROWS + 1 }, (_, i) => ({
      name: `A${i}`,
    }));
    const res = buildMoneyExportResponse("accounts", rows);
    assert.equal(res.status, 413);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, "export_too_large");
  });

  it("moneyExportGet ignores kind query and uses path param only", () => {
    const routePath = join(root, "app/api/money/export/[kind]/route.ts");
    assert.ok(existsSync(routePath), "GET /api/money/export/[kind] must exist");
    const src = readFileSync(routePath, "utf8");
    assert.match(src, /export async function GET/);
    assert.doesNotMatch(
      src,
      /searchParams\.get\(\s*["']kind["']\s*\)/,
      "must not read ?kind= query",
    );
    assert.match(src, /params.*kind|kindParam|context\.params/);
  });

  it("babyExportGet ignores kind query and uses path param only", () => {
    const routePath = join(root, "app/api/baby/export/[kind]/route.ts");
    assert.ok(existsSync(routePath), "GET /api/baby/export/[kind] must exist");
    const src = readFileSync(routePath, "utf8");
    assert.match(src, /export async function GET/);
    assert.doesNotMatch(src, /searchParams\.get\(\s*["']kind["']\s*\)/);
  });

  it("loansExportGet ignores kind query and uses path param only", () => {
    const routePath = join(root, "app/api/loans/export/[kind]/route.ts");
    assert.ok(existsSync(routePath), "GET /api/loans/export/[kind] must exist");
    const src = readFileSync(routePath, "utf8");
    assert.match(src, /export async function GET/);
    assert.doesNotMatch(src, /searchParams\.get\(\s*["']kind["']\s*\)/);
  });

  it("babyImportCommit profile upserts existing workspace profile", async () => {
    const { applyBabyImportRows } = await import("@/lib/baby-import");
    const ledger: {
      profiles: { workspaceId: string; displayName: string; birthDate: string | null }[];
      care: unknown[];
    } = {
      profiles: [
        { workspaceId: "ws-1", displayName: "Old", birthDate: "2020-01-01" },
      ],
      care: [],
    };
    await applyBabyImportRows(
      { workspaceId: "ws-1" },
      "profile",
      [{ displayName: "New", birthDate: "2021-02-02" }],
      {
        upsertProfile: async (row) => {
          const existing = ledger.profiles.find(
            (p) => p.workspaceId === "ws-1",
          );
          if (existing) {
            existing.displayName = String(row.displayName ?? existing.displayName);
            existing.birthDate =
              row.birthDate === undefined
                ? existing.birthDate
                : (row.birthDate as string | null);
            return "upsert";
          }
          ledger.profiles.push({
            workspaceId: "ws-1",
            displayName: String(row.displayName ?? "Baby"),
            birthDate: (row.birthDate as string | null) ?? null,
          });
          return "insert";
        },
        appendCare: async () => {
          throw new Error("care should not run for profile");
        },
      },
    );
    assert.equal(ledger.profiles.length, 1);
    assert.equal(ledger.profiles[0].displayName, "New");
    assert.equal(ledger.profiles[0].birthDate, "2021-02-02");
  });

  it("babyImportCommit care appends new rows without replace", async () => {
    const { applyBabyImportRows } = await import("@/lib/baby-import");
    const care: unknown[] = [{ id: "existing" }];
    await applyBabyImportRows(
      { workspaceId: "ws-1" },
      "care",
      [{ type: "feed", occurredAt: "2026-01-01T00:00:00.000Z" }],
      {
        upsertProfile: async () => {
          throw new Error("profile should not run for care");
        },
        appendCare: async (row) => {
          care.push(row);
          return "append";
        },
      },
    );
    assert.equal(care.length, 2);
    assert.equal((care[0] as { id: string }).id, "existing");
  });

  it("babyExport kinds never include telegram token fields", async () => {
    const { babyExportCsv, BABY_EXPORT_KINDS } = await import("@/lib/baby-export");
    assert.ok(!BABY_EXPORT_KINDS.includes("telegram" as never));
    for (const kind of BABY_EXPORT_KINDS) {
      const csv = babyExportCsv(kind, []);
      assert.doesNotMatch(csv, /token|botToken|bot_token|chatSecret/i);
    }
    const src = readFileSync(join(root, "lib/baby-export.ts"), "utf8");
    assert.doesNotMatch(src, /babyTelegramLink|baby_telegram_link/);
  });

  it("babyExport kinds never include quickCare rows", async () => {
    const src = readFileSync(join(root, "lib/baby-export.ts"), "utf8");
    assert.doesNotMatch(src, /quickCare|baby_quick_care|babyQuickCare/i);
    const { BABY_EXPORT_KINDS } = await import("@/lib/baby-export");
    assert.ok(!(BABY_EXPORT_KINDS as readonly string[]).includes("quick-care"));
    assert.ok(!(BABY_EXPORT_KINDS as readonly string[]).includes("quickCare"));
  });

  it("babyImportCommit idempotencyReplay same key one side effect", () => {
    const route = readFileSync(
      join(root, "app/api/baby/import/commit/route.ts"),
      "utf8",
    );
    assert.match(route, /beginIdempotencyRequest/);
    assert.match(route, /completeIdempotencyClaim/);
    assert.match(route, /Idempotency-Key|keyHeader/);
  });

  it("babyImportCommit idempotency_body_mismatch 409", () => {
    const route = readFileSync(
      join(root, "app/api/baby/import/commit/route.ts"),
      "utf8",
    );
    assert.match(route, /beginIdempotencyRequest/);
    // Money-parity: body mismatch surfaces via beginIdempotencyRequest response
    assert.match(route, /began\.kind === ["']response["']|kind === ["']response["']/);
  });

  it("loansImportCommit loans kind appends without upsert by name", async () => {
    const { applyLoansImportRows } = await import("@/lib/loans-import");
    const loans: { name: string }[] = [{ name: "Home" }];
    await applyLoansImportRows(
      { workspaceId: "ws-1" },
      "loans",
      [{ name: "Home", principalMinor: 100, annualRateBps: 500, termMonths: 12, startDate: "2026-01-01", dueDayOfMonth: 1, paymentMinor: 10 }],
      {
        appendLoan: async (row) => {
          loans.push({ name: String(row.name) });
          return "append";
        },
        upsertInstallment: async () => {
          throw new Error("installment should not run");
        },
      },
    );
    assert.equal(loans.length, 2);
    assert.equal(loans.filter((l) => l.name === "Home").length, 2);
  });

  it("loansImportCommit installment upserts by loan and number", async () => {
    const { applyLoansImportRows } = await import("@/lib/loans-import");
    const schedule = new Map<string, { paymentMinor: number }>();
    schedule.set("loan-1:1", { paymentMinor: 100 });
    await applyLoansImportRows(
      { workspaceId: "ws-1" },
      "installments",
      [
        {
          loanId: "loan-1",
          installmentNumber: 1,
          dueDate: "2026-02-01",
          paymentMinor: 200,
          principalMinor: 150,
          interestMinor: 50,
          balanceAfterMinor: 900,
        },
      ],
      {
        appendLoan: async () => {
          throw new Error("loan append should not run");
        },
        upsertInstallment: async (row) => {
          const key = `${row.loanId}:${row.installmentNumber}`;
          const existing = schedule.get(key);
          if (existing) {
            existing.paymentMinor = Number(row.paymentMinor);
            return "upsert";
          }
          schedule.set(key, { paymentMinor: Number(row.paymentMinor) });
          return "insert";
        },
      },
    );
    assert.equal(schedule.size, 1);
    assert.equal(schedule.get("loan-1:1")?.paymentMinor, 200);
  });

  it("loansImportCommit upserts schedule status then deletes preview", () => {
    const route = readFileSync(
      join(root, "app/api/loans/import/commit/route.ts"),
      "utf8",
    );
    const rlsStart = route.indexOf("withLoansWorkspaceRls(ctx");
    assert.ok(rlsStart >= 0, "expected withLoansWorkspaceRls callback");
    const rlsBody = route.slice(rlsStart, rlsStart + 1200);
    assert.match(rlsBody, /commitLoansImport|applyLoansImport/);
    assert.match(rlsBody, /deleteImportPreview|deleteLoansImportPreview/);
    assert.match(rlsBody, /completeIdempotencyClaim/);
    // prune outside commit (call site, not import)
    const pruneIdx = route.indexOf("await pruneExpired");
    assert.ok(pruneIdx >= 0 && pruneIdx < rlsStart, "prune must run before RLS callback");
  });

  it("loansImportCommit idempotencyReplay same key one side effect", () => {
    const route = readFileSync(
      join(root, "app/api/loans/import/commit/route.ts"),
      "utf8",
    );
    assert.match(route, /beginIdempotencyRequest/);
    assert.match(route, /completeIdempotencyClaim/);
  });

  it("loansImportCommit idempotency_body_mismatch 409", () => {
    const route = readFileSync(
      join(root, "app/api/loans/import/commit/route.ts"),
      "utf8",
    );
    assert.match(route, /began\.kind === ["']response["']|kind === ["']response["']/);
  });

  it("loansImportCommit rejects missing previewId", async () => {
    const { validateLoansImportCommitBody } = await import("@/lib/loans-import");
    const parsed = validateLoansImportCommitBody({ type: "loans", rows: [] });
    assert.equal(parsed.ok, false);
    assert.match(String(parsed.message), /preview/i);
  });

  it("loansExport never serializes push subscription rows", async () => {
    const src = readFileSync(join(root, "lib/loans-export.ts"), "utf8");
    assert.doesNotMatch(src, /loanPushSubscription|loan_push_subscription|p256dh/);
    const { LOANS_EXPORT_KINDS, loansExportCsv } = await import("@/lib/loans-export");
    assert.ok(!(LOANS_EXPORT_KINDS as readonly string[]).includes("push"));
    for (const kind of LOANS_EXPORT_KINDS) {
      assert.doesNotMatch(loansExportCsv(kind, []), /endpoint|p256dh/);
    }
  });

  it("investmentExportInstruments does not read quote tables", () => {
    const src = readFileSync(join(root, "lib/investment-export.ts"), "utf8");
    assert.doesNotMatch(src, /investmentQuote|investment_quote|quoteDaily/);
    const route = readFileSync(
      join(root, "app/api/investment/export/instruments/route.ts"),
      "utf8",
    );
    assert.doesNotMatch(route, /investmentQuote|investment_quote/);
  });

  it("investmentExportTradeJournal filters by workspaceId", () => {
    const src = readFileSync(join(root, "lib/investment-export.ts"), "utf8");
    assert.match(src, /workspaceId/);
    assert.match(src, /investmentTradeJournal|trade.journal|trade_journal/i);
  });

  it("moneyExportGet denies foreign workspace", () => {
    const route = readFileSync(
      join(root, "app/api/money/export/[kind]/route.ts"),
      "utf8",
    );
    assert.match(route, /requireMoneyContext/);
    // read scope — no requireWrite
    assert.doesNotMatch(route, /requireWrite:\s*true/);
  });

  it("babyImportCommit rejects missing previewId", async () => {
    const { validateBabyImportCommitBody } = await import("@/lib/baby-import");
    const parsed = validateBabyImportCommitBody({ type: "care", rows: [] });
    assert.equal(parsed.ok, false);
    assert.match(String(parsed.message), /preview/i);
  });

  it("dbHousekeeping prunes baby_import_preview and loans_import_preview", () => {
    const src = readFileSync(join(root, "lib/db-housekeeping.ts"), "utf8");
    assert.match(src, /baby_import_preview|pruneExpiredBabyImportPreviews/);
    assert.match(src, /loans_import_preview|pruneExpiredLoansImportPreviews/);
  });

  it("babySettingsImportExportHub includes Import and Export links", () => {
    const src = readFileSync(
      join(root, "components/baby-settings-page.tsx"),
      "utf8",
    );
    assert.match(src, /\/baby\/import\/\$\{kind\}|\/baby\/import\/profile/);
    assert.match(src, /\/api\/baby\/export\/\$\{kind\}|\/api\/baby\/export\//);
    assert.match(src, />\s*Import\s*</);
  });

  it("loansSettingsImportExportHub includes Import and Export links", () => {
    const src = readFileSync(
      join(root, "components/loans-settings/loans-settings-notifications.tsx"),
      "utf8",
    );
    assert.match(src, /\/loans\/import\/\$\{kind\}|\/loans\/import\/loans/);
    assert.match(src, /\/api\/loans\/export\/\$\{kind\}|\/api\/loans\/export\//);
    assert.match(src, />\s*Import\s*</);
  });

  it("babyImportCommit rejects invalid care type", async () => {
    const { validateBabyImportRows } = await import("@/lib/baby-import");
    const parsed = validateBabyImportRows("care", [
      { type: "not-a-care-type", occurredAt: "2026-01-01T00:00:00.000Z" },
    ]);
    assert.equal(parsed.ok, false);
    assert.match(String(parsed.message), /type|care|feed|diaper|sleep/i);
  });

  it("loansExportInstallments bounds by workspace join not unbounded loan id list", () => {
    const src = readFileSync(join(root, "lib/loans-export.ts"), "utf8");
    assert.match(src, /innerJoin|leftJoin/);
    assert.doesNotMatch(
      src,
      /select\(\s*\{\s*id:\s*loan\.id\s*\}\s*\)[\s\S]*from\(loan\)[\s\S]*where\(eq\(loan\.workspaceId/,
    );
  });

  it("moneyImportKinds never includes all", () => {
    assert.equal(isMoneyImportKind("all"), false);
  });

  it("moneyExportAll returns zip of kind csv members", async () => {
    const { buildMoneyExportAllResponse } = await import("@/lib/money-export");
    const { readZip } = await import("@/lib/export-zip");
    const res = buildMoneyExportAllResponse({
      accounts: [{ name: "Cash", type: "cash", currency: "USD" }],
    });
    assert.equal(res.status, 200);
    assert.match(res.headers.get("Content-Type") ?? "", /zip/);
    const buf = new Uint8Array(await res.arrayBuffer());
    const entries = readZip(buf);
    const names = entries.map((e) => e.name).sort();
    assert.ok(names.includes("accounts.csv"));
    assert.ok(names.includes("transactions.csv"));
  });

  it("moneyExportAll returns 413 export_too_large when any kind over cap", async () => {
    const { buildMoneyExportAllResponse, MONEY_EXPORT_MAX_ROWS } = await import(
      "@/lib/money-export"
    );
    const rows = Array.from({ length: MONEY_EXPORT_MAX_ROWS + 1 }, (_, i) => ({
      name: `A${i}`,
    }));
    const res = buildMoneyExportAllResponse({ accounts: rows });
    assert.equal(res.status, 413);
    const body = (await res.json()) as { code?: string };
    assert.equal(body.code, "export_too_large");
  });

  it("moneyImportAllPreview rejects unknown filenames", async () => {
    const { buildZip } = await import("@/lib/export-zip");
    const { parseMoneyImportAllZip } = await import("@/lib/money-import-all");
    const zip = buildZip([
      { name: "evil.csv", data: new TextEncoder().encode("a\n1\n") },
    ]);
    const parsed = parseMoneyImportAllZip(zip);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.match(parsed.error, /unknown|evil/i);
  });

  it("moneyImportAllPreview skips missing kind with warning", async () => {
    const { buildZip } = await import("@/lib/export-zip");
    const { parseMoneyImportAllZip } = await import("@/lib/money-import-all");
    const zip = buildZip([
      {
        name: "accounts.csv",
        data: new TextEncoder().encode("name,type,currency\nCash,cash,USD\n"),
      },
    ]);
    const parsed = parseMoneyImportAllZip(zip);
    assert.equal(parsed.ok, true);
    if (parsed.ok) {
      assert.ok(parsed.preview.warnings.some((w) => /transactions/i.test(w)));
      assert.deepEqual(parsed.preview.presentKinds, ["accounts"]);
    }
  });

  it("moneyImportAllCommit runs kinds in dependency order", async () => {
    const { commitMoneyImportAll } = await import("@/lib/money-import-all");
    const { MONEY_IMPORT_ALL_ORDER } = await import("@/lib/money-import-kinds");
    const order: string[] = [];
    const accountId = "11111111-1111-4111-8111-111111111111";
    await commitMoneyImportAll(
      { userSub: "u", workspaceId: "w" },
      {
        mode: "all",
        kinds: {
          transactions: [
            {
              accountId,
              kind: "expense",
              amountMinor: "100",
              occurredAt: "2026-01-01T00:00:00.000Z",
            },
          ],
          accounts: [{ name: "Cash", type: "checking" }],
        },
        warnings: [],
        presentKinds: ["accounts", "transactions"],
      },
      async (_ctx, kind) => {
        order.push(kind);
        return 1;
      },
    );
    assert.deepEqual(order, ["accounts", "transactions"]);
    assert.ok(
      MONEY_IMPORT_ALL_ORDER.indexOf("accounts") <
        MONEY_IMPORT_ALL_ORDER.indexOf("transactions"),
    );
  });

  it("moneyImportAllCommit stops on first fail keeps earlier kinds", async () => {
    const { commitMoneyImportAll } = await import("@/lib/money-import-all");
    const result = await commitMoneyImportAll(
      { userSub: "u", workspaceId: "w" },
      {
        mode: "all",
        kinds: {
          accounts: [{ name: "Cash", type: "checking" }],
          categories: [{ name: "Food", kind: "expense" }],
        },
        warnings: [],
        presentKinds: ["accounts", "categories"],
      },
      async (_ctx, kind) => {
        if (kind === "categories") throw new Error("boom");
        return 1;
      },
    );
    assert.deepEqual(result.committedKinds, ["accounts"]);
    assert.equal(result.failedKind, "categories");
    assert.match(String(result.error), /boom/);
  });

  it("babyLoansExportImportAll mirror money zip and order", () => {
    assert.ok(existsSync(join(root, "app/api/baby/export/all/route.ts")));
    assert.ok(existsSync(join(root, "app/api/baby/import/all/preview/route.ts")));
    assert.ok(existsSync(join(root, "app/api/baby/import/all/commit/route.ts")));
    assert.ok(existsSync(join(root, "app/api/loans/export/all/route.ts")));
    assert.ok(existsSync(join(root, "app/api/loans/import/all/preview/route.ts")));
    assert.ok(existsSync(join(root, "app/api/loans/import/all/commit/route.ts")));
    const baby = readFileSync(join(root, "lib/baby-import-kinds.ts"), "utf8");
    assert.match(baby, /BABY_IMPORT_ALL_ORDER/);
    const loans = readFileSync(join(root, "lib/loans-import-kinds.ts"), "utf8");
    assert.match(loans, /LOANS_IMPORT_ALL_ORDER/);
  });

  it("investmentExportAll zip contains instruments and trade-journal only", () => {
    assert.ok(existsSync(join(root, "app/api/investment/export/all/route.ts")));
    const src = readFileSync(join(root, "lib/investment-export.ts"), "utf8");
    assert.match(src, /instruments\.csv/);
    assert.match(src, /trade-journal\.csv/);
    assert.match(src, /exportInvestmentAllZip/);
  });

  it("investmentImportAll has no zip preview commit routes", () => {
    assert.equal(
      existsSync(join(root, "app/api/investment/import/all/preview/route.ts")),
      false,
    );
    assert.equal(
      existsSync(join(root, "app/api/investment/import/all/commit/route.ts")),
      false,
    );
  });

  it("featureImportExportHub shows exportAll and importAll actions", () => {
    for (const [label, path] of [
      ["Money", "components/money-workspace-settings.tsx"],
      ["Baby", "components/baby-settings-page.tsx"],
      ["Loans", "components/loans-settings/loans-settings-notifications.tsx"],
      [
        "Investment",
        "components/investment-settings/investment-workspace-settings.tsx",
      ],
    ] as const) {
      const src = readFileSync(join(root, path), "utf8");
      assert.match(src, /Export all/, `${label} hub missing Export all`);
      assert.match(src, /Import all/, `${label} hub missing Import all`);
      assert.match(src, /\/export\/all/, `${label} hub missing export/all href`);
    }
  });
});
