#!/usr/bin/env node
/**
 * One-off: seed disposable e2e workspace so Investments Insights is non-empty.
 * Uses E2E_STORAGE_STATE cookies against a running app.
 * Not part of the CI suite — run manually before finance e2e when Insights is empty.
 *
 * Usage:
 *   E2E_STORAGE_STATE=e2e/.auth/user.json node scripts/seed-e2e-investments-insights.mjs
 */
import { chromium } from "@playwright/test";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const storagePath = path.resolve(
  root,
  process.env.E2E_STORAGE_STATE?.trim() || "e2e/.auth/user.json",
);

const NOTE = `e2e-seed-investments-${Date.now()}`;

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

const browser = await chromium.launch();
const context = await browser.newContext({
  baseURL,
  storageState: storagePath,
});
const page = await context.newPage();

/** Same-origin GraphQL via page.fetch (avoids Playwright request CORS to localhost). */
async function gql(query, variables) {
  return page.evaluate(
    async ({ query, variables }) => {
      const res = await fetch("/api/graphql", {
        method: "POST",
        headers: { "content-type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ query, variables }),
      });
      const text = await res.text();
      let body;
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON ${res.status}: ${text.slice(0, 200)}`);
      }
      if (!res.ok || body.errors?.length) {
        throw new Error(
          `GraphQL ${res.status}: ${JSON.stringify(body.errors ?? body).slice(0, 800)}`,
        );
      }
      return body.data;
    },
    { query, variables },
  );
}

try {
  await page.goto("/money", { waitUntil: "domcontentloaded" });
  if (page.url().includes("/login")) {
    throw new Error(
      "Session missing or expired — re-save E2E_STORAGE_STATE (see e2e/helpers/auth.ts)",
    );
  }

  const boot = await gql(`query {
      moneyBootstrap {
        workspaceId
        accounts
        categories
      }
      investmentInstruments {
        id
        symbol
        archived
      }
    }`);

  const workspaceId = boot.moneyBootstrap?.workspaceId;
  const accounts = boot.moneyBootstrap?.accounts ?? [];
  const categories = boot.moneyBootstrap?.categories ?? [];
  if (!workspaceId) throw new Error("No money workspace on session");

  const cash =
    accounts.find(
      (a) =>
        !a.archived &&
        (a.type === "cash" || a.type === "checking" || a.type === "savings" || a.type === "bank"),
    ) ??
    accounts.find((a) => !a.archived && a.type !== "loan" && a.type !== "credit") ??
    accounts.find((a) => !a.archived);
  if (!cash?.id) throw new Error("No money account for investment cash");

  let income = categories.find((c) => !c.archived && c.kind === "income");
  let expense = categories.find((c) => !c.archived && c.kind === "expense");
  if (!expense?.id) {
    throw new Error("Need at least one expense category for instrument ledger defaults");
  }
  if (!income?.id) {
    const createdCat = await gql(
      `mutation($input: MoneyCategoryCreateInput!) {
        moneyCategoryCreate(input: $input)
      }`,
      { input: { name: "E2E Investment profit", kind: "income" } },
    );
    income = createdCat.moneyCategoryCreate;
    if (!income?.id) throw new Error("Failed to create income category");
    console.log("Created income category", income.id);
  }

  const existing = (boot.investmentInstruments ?? []).filter((i) => !i.archived);
  let instrumentId = existing[0]?.id;

  if (!instrumentId) {
    const created = await gql(
      `mutation($input: InvestmentInstrumentCreateInput!) {
        investmentInstrumentCreate(input: $input) { id symbol }
      }`,
      {
        input: {
          kind: "stocks",
          symbol: "E2ESEED",
          currency: cash.currency ?? "USD",
          moneyAccountId: cash.id,
          incomeCategoryId: income.id,
          expenseCategoryId: expense.id,
        },
      },
    );
    instrumentId = created.investmentInstrumentCreate.id;
    console.log("Created instrument", created.investmentInstrumentCreate.symbol, instrumentId);
  } else {
    console.log("Reusing instrument", existing[0].symbol, instrumentId);
  }

  const activity = await gql(
    `mutation($input: InvestmentActivityCreateInput!) {
      investmentActivityCreate(input: $input) { id }
    }`,
    {
      input: {
        instrumentId,
        activityDate: todayIsoDate(),
        type: "buy",
        quantity: "1",
        openPrice: "100",
        notes: NOTE,
        moneyAccountId: cash.id,
      },
    },
  );
  console.log("Created open buy activity", activity.investmentActivityCreate.id, NOTE);
  console.log("Workspace", workspaceId, "— Investments Insights should be non-empty now.");
} finally {
  await context.close();
  await browser.close();
}
