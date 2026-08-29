export type ApiHelpSectionId =
  | "overview"
  | "token"
  | "auth"
  | "guides"
  | "graphql-query"
  | "graphql-mutate"
  | "graphql-schema"
  | "rest-import"
  | "errors"
  | "security";

export type ApiHelpStep = {
  step: number;
  label: string;
  sectionId: ApiHelpSectionId;
};

export type ApiHelpCodeSample = {
  id: string;
  label?: string;
  language: "bash" | "http" | "json" | "javascript";
  /** Use $BASE_URL for the app origin (replaced client-side). */
  body: string;
};

export type ApiHelpBadge = {
  label: string;
  tone?: "default" | "accent" | "muted" | "destructive";
};

export type ApiHelpRestRow = {
  method: string;
  path: string;
  auth: string;
  notes: string;
};

export type ApiHelpGraphqlQueryExample = {
  id: string;
  /** Root query field, e.g. moneyAccounts */
  field: string;
  tabLabel?: string;
  category?: "money" | "loans" | "investments";
  operationKind: "query" | "mutation";
  summary: string;
  purpose: string;
  whenToUse: string;
  returns: string;
  inputNotes?: string[];
  usageNotes?: string[];
  badges?: ApiHelpBadge[];
  query: string;
  variables?: Record<string, unknown>;
};

export type ApiHelpRestExample = {
  id: string;
  tabLabel: string;
  category?: "money" | "loans" | "investments" | "tokens" | "workspace";
  method: string;
  path: string;
  auth: string;
  summary: string;
  purpose: string;
  whenToUse: string;
  returns: string;
  inputNotes?: string[];
  usageNotes?: string[];
  badges?: ApiHelpBadge[];
  codeSample: ApiHelpCodeSample;
};

export type ApiHelpWorkflowStep = {
  stepNumber: number;
  title: string;
  summary: string;
  explanation: string;
  codeSamples: ApiHelpCodeSample[];
  keyNotes?: string[];
};

export type ApiHelpWorkflowGuide = {
  id: string;
  title: string;
  shortTitle: string;
  badge: string;
  badgeTone?: "default" | "accent" | "muted";
  description: string;
  prerequisites: string[];
  steps: ApiHelpWorkflowStep[];
  rulesAndGotchas: { term: string; explanation: string }[];
};

export type ApiHelpSection = {
  id: ApiHelpSectionId;
  title: string;
  description: string;
  bullets?: string[];
  codeSamples?: ApiHelpCodeSample[];
  graphqlQueries?: ApiHelpGraphqlQueryExample[];
  graphqlMutations?: ApiHelpGraphqlQueryExample[];
  restApis?: ApiHelpRestExample[];
  restTable?: ApiHelpRestRow[];
  scopeTable?: { scope: string; allows: string }[];
};

export const API_HELP_BASE_URL_PLACEHOLDER = "$BASE_URL";

function minifyGraphql(query: string): string {
  return query.replace(/\s+/g, " ").trim();
}

/** Builds a curl example for POST /api/graphql. */
export function buildGraphqlCurlExample(
  query: string,
  variables?: Record<string, unknown>,
): string {
  const payload: { query: string; variables?: Record<string, unknown> } = {
    query: minifyGraphql(query),
  };
  if (variables !== undefined) {
    payload.variables = variables;
  }
  const json = JSON.stringify(payload);
  return `curl -sS "${API_HELP_BASE_URL_PLACEHOLDER}/api/graphql" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '${json}'`;
}

export function buildSessionFetchExample(
  path: string,
  opts?: { method?: string; body?: Record<string, unknown> },
): string {
  const method = opts?.method ?? "GET";
  const lines = [
    `const res = await fetch("${API_HELP_BASE_URL_PLACEHOLDER}${path}", {`,
    `  method: "${method}",`,
    `  credentials: "include",`,
  ];
  if (opts?.body) {
    lines.push(`  headers: { "Content-Type": "application/json" },`);
    lines.push(`  body: JSON.stringify(${JSON.stringify(opts.body, null, 2)}),`);
  }
  lines.push("});");
  lines.push("const body = await res.json();");
  lines.push("console.log(body);");
  return lines.join("\n");
}

export function buildBearerFetchExample(
  path: string,
  opts?: { method?: string; body?: Record<string, unknown> },
): string {
  const method = opts?.method ?? "GET";
  const lines = [
    `const res = await fetch("${API_HELP_BASE_URL_PLACEHOLDER}${path}", {`,
    `  method: "${method}",`,
    `  headers: {`,
    `    "Authorization": "Bearer mny_YOUR_TOKEN",`,
    `    "Content-Type": "application/json",`,
    `  },`,
  ];
  if (opts?.body) {
    lines.push(`  body: JSON.stringify(${JSON.stringify(opts.body, null, 2)}),`);
  }
  lines.push("});");
  lines.push("const json = await res.json();");
  lines.push("console.log(json);");
  return lines.join("\n");
}

/* -------------------------------------------------------------------------- */
/* STEP-BY-STEP WORKFLOW GUIDES                                               */
/* -------------------------------------------------------------------------- */

export const apiHelpDataFetchGuide: ApiHelpWorkflowGuide = {
  id: "guide-data-fetch",
  title: "Querying Accounts, Categories, Merchants & Transactions",
  shortTitle: "Query Data",
  badge: "Read Reference",
  badgeTone: "accent",
  description:
    "How to load reference data in a single request or inspect specific accounts, categories, merchants, and paginated transactions with date filters.",
  prerequisites: [
    "API Token with read scope (or write).",
    "Endpoint: POST /api/graphql with Authorization: Bearer mny_YOUR_TOKEN.",
  ],
  steps: [
    {
      stepNumber: 1,
      title: "Bootstrap Workspace Reference in One Request",
      summary: "Fetch active workspace metadata, accounts, categories, merchants, and tags together.",
      explanation:
        "Instead of issuing multiple queries, call `moneyBootstrap` on startup. This returns everything needed to populate dropdowns, form pickers, and currency formatting rules.",
      codeSamples: [
        {
          id: "fetch-step1-curl",
          label: "cURL (One-shot bootstrap)",
          language: "bash",
          body: buildGraphqlCurlExample(`query {
  moneyBootstrap {
    workspaceId
    defaultCurrency
    needsCurrencySetup
    workspaces { id name kind isDefault }
    accounts
    categories
    tags
  }
}`),
        },
        {
          id: "fetch-step1-js",
          label: "JavaScript Fetch",
          language: "javascript",
          body: `const res = await fetch("${API_HELP_BASE_URL_PLACEHOLDER}/api/graphql", {
  method: "POST",
  headers: {
    "Authorization": "Bearer mny_YOUR_TOKEN",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: \`query {
      moneyBootstrap {
        workspaceId
        defaultCurrency
        accounts
        categories
        tags
      }
    }\`
  }),
});
const { data } = await res.json();
console.log("Accounts:", data.moneyBootstrap.accounts);`,
        },
      ],
      keyNotes: [
        "Returns accounts, categories, and tags as JSON arrays.",
        "Response is cached on the server for 60 seconds unless invalidated by a mutation.",
      ],
    },
    {
      stepNumber: 2,
      title: "Query Specific Lists (Accounts, Categories, Merchants)",
      summary: "Fetch dedicated lists when you only need a specific domain model.",
      explanation:
        "When you only need a single slice of reference data (such as updating an account balance picker or checking merchant normalization), use individual root queries.",
      codeSamples: [
        {
          id: "fetch-step2-accounts-curl",
          label: "cURL (Accounts, Categories & Merchants)",
          language: "bash",
          body: buildGraphqlCurlExample(`query {
  moneyAccounts
  moneyCategories
  moneyMerchants
}`),
        },
        {
          id: "fetch-step2-response",
          label: "Sample JSON Response Shape",
          language: "json",
          body: `{
  "data": {
    "moneyAccounts": [
      { "id": "acc_001", "name": "Checking Account", "type": "checking", "balanceMinor": 125000 }
    ],
    "moneyCategories": [
      { "id": "cat_001", "name": "Food & Dining", "kind": "expense", "parentId": null }
    ],
    "moneyMerchants": [
      { "id": "mer_001", "name": "Supermarket", "normalizedName": "supermarket" }
    ]
  }
}`,
        },
      ],
      keyNotes: [
        "`moneyAccounts`: Includes `id`, `name`, `type`, `balanceMinor`, `institution`, and `archived`.",
        "`moneyCategories`: Includes `id`, `name`, `kind` (`expense` or `income`), and `parentId` for subcategories.",
      ],
    },
    {
      stepNumber: 3,
      title: "Query & Filter Paginated Transactions",
      summary: "Query transactions with ISO datetime ranges, account/category filters, and pagination.",
      explanation:
        "Use `moneyTransactions(query: $query)` to retrieve rows with sorting and pagination. The `query.from` and `query.to` dates must be ISO-8601 strings with timezone offsets.",
      codeSamples: [
        {
          id: "fetch-step3-tx-curl",
          label: "cURL (Filtered Transaction Query)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `query($query: JSONObject!) {
  moneyTransactions(query: $query) {
    data
    total
    page
    pageSize
    nextCursor
  }
}`,
            {
              query: {
                from: "2025-01-01T00:00:00.000Z",
                to: "2025-01-31T23:59:59.999Z",
                page: 1,
                pageSize: 25,
                sort: "occurredAt",
                dir: "desc",
                accountIds: ["00000000-0000-0000-0000-000000000101"],
                kinds: ["expense", "income"],
              },
            },
          ),
        },
        {
          id: "fetch-step3-variables",
          label: "GraphQL Variables Format",
          language: "json",
          body: `{
  "query": {
    "from": "2025-01-01T00:00:00.000Z",
    "to": "2025-01-31T23:59:59.999Z",
    "page": 1,
    "pageSize": 50,
    "sort": "occurredAt",
    "dir": "desc",
    "kinds": ["expense"]
  }
}`,
        },
      ],
      keyNotes: [
        "Filter keys available: `from`, `to`, `accountIds`, `categoryIds`, `merchantIds`, `tagIds`, `kinds`, `recurrence`.",
        "Sort keys: `occurredAt`, `amountMinor`, `createdAt`. Direction is `asc` or `desc`.",
      ],
    },
    {
      stepNumber: 4,
      title: "Fetch Single Transaction by ID",
      summary: "Look up a transaction detail record by its UUID.",
      explanation:
        "Pass a transaction UUID to `moneyTransaction(id: $id)` to get complete details, including linked category, merchant, tags, and recurrence template links.",
      codeSamples: [
        {
          id: "fetch-step4-single-curl",
          label: "cURL (Single Transaction Lookup)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `query($id: ID!) {
  moneyTransaction(id: $id)
}`,
            { id: "00000000-0000-0000-0000-000000000801" },
          ),
        },
      ],
      keyNotes: [
        "Returns null if the transaction does not exist or belongs to another workspace.",
      ],
    },
  ],
  rulesAndGotchas: [
    {
      term: "ISO-8601 Timestamps",
      explanation:
        "Always pass full ISO timestamps with timezone offsets (e.g. `2025-01-15T12:00:00.000Z` or `+07:00`).",
    },
    {
      term: "Minor Currency Units",
      explanation:
        "All monetary balances and transaction amounts (`balanceMinor`, `amountMinor`) are stored as integers representing the smallest currency unit ($10.50 = 1050).",
    },
  ],
};

export const apiHelpTransactionGuide: ApiHelpWorkflowGuide = {
  id: "guide-add-transactions",
  title: "Adding Transactions via API",
  shortTitle: "Add Transactions",
  badge: "GraphQL & REST",
  badgeTone: "accent",
  description:
    "Complete developer walkthrough for recording expenses, income, inter-account transfers, recurring schedules, and direct JSON bulk imports.",
  prerequisites: [
    "API Token with write scope (`mny_...`).",
    "Valid `accountId` (retrieved from `moneyAccounts` or `moneyBootstrap`).",
    "Optional `categoryId` and `merchantId`.",
  ],
  steps: [
    {
      stepNumber: 1,
      title: "Discover Target Account & Category IDs",
      summary: "Run a quick query to obtain the UUIDs required for your mutation.",
      explanation:
        "Every transaction belongs to an account and optionally a category. Query `moneyAccounts` and `moneyCategories` to obtain valid IDs before creating transactions.",
      codeSamples: [
        {
          id: "tx-step1-curl",
          label: "cURL (Get IDs)",
          language: "bash",
          body: buildGraphqlCurlExample(`query {
  moneyAccounts
  moneyCategories
}`),
        },
      ],
      keyNotes: [
        "Save the `id` from the account record you wish to debit or credit.",
      ],
    },
    {
      stepNumber: 2,
      title: "Create Single Expense or Income Transaction",
      summary: "Post a regular spending or income event with notes and tags.",
      explanation:
        "Use `moneyTransactionCreate`. Specify `accountId`, `amountMinor` (positive integer), `kind` (`expense` or `income`), `occurredAt`, and optional `categoryId`, `merchantId`, and `notes`.",
      codeSamples: [
        {
          id: "tx-step2-expense-curl",
          label: "cURL (Create Expense)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `mutation($input: MoneyTransactionCreateInput!) {
  moneyTransactionCreate(input: $input)
}`,
            {
              input: {
                accountId: "00000000-0000-0000-0000-000000000101",
                kind: "expense",
                amountMinor: 2599,
                occurredAt: "2025-01-15T14:30:00.000Z",
                categoryId: "00000000-0000-0000-0000-000000000201",
                notes: "Team lunch",
                tagNames: ["Work", "Meals"],
              },
            },
          ),
        },
        {
          id: "tx-step2-income-curl",
          label: "cURL (Create Income)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `mutation($input: MoneyTransactionCreateInput!) {
  moneyTransactionCreate(input: $input)
}`,
            {
              input: {
                accountId: "00000000-0000-0000-0000-000000000101",
                kind: "income",
                amountMinor: 350000,
                occurredAt: "2025-01-31T09:00:00.000Z",
                notes: "Consulting paycheck",
              },
            },
          ),
        },
      ],
      keyNotes: [
        "`amountMinor: 2599` represents $25.99 (or €25.99).",
        "`tagNames`: Will automatically find or create matching workspace tags.",
      ],
    },
    {
      stepNumber: 3,
      title: "Create Inter-Account Transfer (Paired Legs)",
      summary: "Move money between two accounts in the same workspace.",
      explanation:
        "Set `kind: \"transfer\"`, specify the source `accountId` and destination `toAccountId`. The backend automatically creates paired out-leg and in-leg records.",
      codeSamples: [
        {
          id: "tx-step3-transfer-curl",
          label: "cURL (Account Transfer)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `mutation($input: MoneyTransactionCreateInput!) {
  moneyTransactionCreate(input: $input)
}`,
            {
              input: {
                accountId: "00000000-0000-0000-0000-000000000101",
                toAccountId: "00000000-0000-0000-0000-000000000102",
                kind: "transfer",
                amountMinor: 100000,
                occurredAt: "2025-01-20T10:00:00.000Z",
                notes: "Transfer checking to savings",
              },
            },
          ),
        },
      ],
      keyNotes: [
        "`toAccountId` must be different from `accountId` and reside in the same workspace.",
        "Categories and merchants are ignored on transfer transactions.",
      ],
    },
    {
      stepNumber: 4,
      title: "Create Recurring Transaction (Post First + Schedule)",
      summary: "Record the initial transaction and generate a recurring template for future cron runs.",
      explanation:
        "Include the `recurrence` object with `cadence` (`daily`, `weekly`, `biweekly`, `monthly`, `quarterly`, `yearly`). This posts the first transaction immediately and saves a schedule template.",
      codeSamples: [
        {
          id: "tx-step4-recurring-curl",
          label: "cURL (Recurring Transaction)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `mutation($input: MoneyTransactionCreateInput!) {
  moneyTransactionCreate(input: $input)
}`,
            {
              input: {
                accountId: "00000000-0000-0000-0000-000000000101",
                kind: "expense",
                amountMinor: 120000,
                occurredAt: "2025-02-01T00:00:00.000Z",
                categoryId: "00000000-0000-0000-0000-000000000201",
                notes: "Office rent",
                recurrence: {
                  cadence: "monthly",
                  name: "Monthly Office Rent",
                },
              },
            },
          ),
        },
      ],
      keyNotes: [
        "If you only want to save a schedule template without creating a transaction today, use `moneyRecurrenceCreate` instead.",
      ],
    },
    {
      stepNumber: 5,
      title: "Bulk Direct Import via REST Endpoint",
      summary: "Import multiple validated transaction records directly via REST.",
      explanation:
        "For bulk scripts and data migrations, call `POST /api/money/import/transactions` with a JSON payload of rows. This bypasses the CSV preview step and writes records immediately.",
      codeSamples: [
        {
          id: "tx-step5-rest-curl",
          label: "cURL (REST Direct Bulk Import)",
          language: "bash",
          body: `curl -sS -X POST "${API_HELP_BASE_URL_PLACEHOLDER}/api/money/import/transactions" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "rows": [
      {
        "accountId": "00000000-0000-0000-0000-000000000101",
        "kind": "expense",
        "amountMinor": 1550,
        "occurredAt": "2025-01-10T12:00:00.000Z",
        "notes": "Coffee & snacks"
      },
      {
        "accountId": "00000000-0000-0000-0000-000000000101",
        "kind": "expense",
        "amountMinor": 4200,
        "occurredAt": "2025-01-11T18:00:00.000Z",
        "notes": "Books"
      }
    ]
  }'`,
        },
      ],
      keyNotes: [
        "Returns `{ data: { created: 2 } }` upon success.",
        "Requires Bearer token with write scope.",
      ],
    },
  ],
  rulesAndGotchas: [
    {
      term: "Minor Integer Units",
      explanation:
        "Amounts are integers in minor units (cents). Never send decimal floats like 25.99 in `amountMinor`.",
    },
    {
      term: "Write Scope Enforcement",
      explanation:
        "All mutation and import endpoints require the `write` scope. Read-only tokens receive HTTP 403 Forbidden.",
    },
  ],
};

export const apiHelpLoanGuide: ApiHelpWorkflowGuide = {
  id: "guide-loans",
  title: "Adding & Managing Loans via API",
  shortTitle: "Loans & Payments",
  badge: "Loans GraphQL",
  badgeTone: "accent",
  description:
    "How to create amortized loans, query repayment schedules and due installments, and record payments with linked Money expense transactions.",
  prerequisites: [
    "API Token with write scope (`mny_...`).",
    "Loan parameters: Principal amount, annual interest rate in basis points (bps), and term months.",
    "Optional `moneyAccountId` and `moneyCategoryId` for automatic expense logging.",
  ],
  steps: [
    {
      stepNumber: 1,
      title: "Create a Loan with Auto-Generated Amortization",
      summary: "Define principal, interest rate, term, and payment schedule.",
      explanation:
        "Call `loanCreate`. The backend calculates monthly principal/interest splits, balance curves, and generates the full amortization installment schedule.",
      codeSamples: [
        {
          id: "loan-step1-create-curl",
          label: "cURL (Create Loan)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `mutation($input: LoanCreateInput!) {
  loanCreate(input: $input) {
    id
  }
}`,
            {
              input: {
                name: "Car Loan",
                principalMinor: 2500000,
                annualRateBps: 850,
                termMonths: 36,
                startDate: "2025-01-01",
                dueDayOfMonth: 15,
                moneyAccountId: "00000000-0000-0000-0000-000000000101",
                moneyCategoryId: "00000000-0000-0000-0000-000000000201",
              },
            },
          ),
        },
        {
          id: "loan-step1-create-js",
          label: "JavaScript Fetch",
          language: "javascript",
          body: `const res = await fetch("${API_HELP_BASE_URL_PLACEHOLDER}/api/graphql", {
  method: "POST",
  headers: {
    "Authorization": "Bearer mny_YOUR_TOKEN",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    query: \`mutation($input: LoanCreateInput!) {
      loanCreate(input: $input) { id }
    }\`,
    variables: {
      input: {
        name: "Home Mortgage",
        principalMinor: 35000000,
        annualRateBps: 675,
        termMonths: 240,
        startDate: "2025-01-01",
        dueDayOfMonth: 1,
      }
    }
  }),
});
const { data } = await res.json();
console.log("Created Loan ID:", data.loanCreate.id);`,
        },
      ],
      keyNotes: [
        "`annualRateBps`: Interest rate in basis points. 850 = 8.50%, 675 = 6.75%.",
        "`principalMinor`: $25,000.00 is represented as `2500000`.",
        "`autoMarkPastDuePaid`: Optional boolean to automatically mark historical installments as paid.",
      ],
    },
    {
      stepNumber: 2,
      title: "Query Repayment Schedule & Due Installments",
      summary: "Inspect amortization breakdown or retrieve upcoming due items across all loans.",
      explanation:
        "Call `loansDueInstallments` to find installments due soon, or `loan(id: $id)` to retrieve the complete breakdown of every scheduled payment (principal, interest, balance remaining).",
      codeSamples: [
        {
          id: "loan-step2-due-curl",
          label: "cURL (List Due Installments)",
          language: "bash",
          body: buildGraphqlCurlExample(`query {
  loansDueInstallments {
    scheduleInstallmentId
    loanId
    loanName
    installmentNumber
    dueDate
    paymentMinor
    currency
    moneyAccountId
    moneyCategoryId
  }
}`),
        },
        {
          id: "loan-step2-detail-curl",
          label: "cURL (Loan Detail & Full Schedule)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `query($id: ID!) {
  loan(id: $id) {
    id
    name
    status
    principalMinor
    remainingMinor
    percentComplete
    summary {
      totalPaidMinor
      remainingMinor
      monthsAheadBehind
    }
    installments {
      scheduleInstallmentId
      installmentNumber
      dueDate
      paymentMinor
      principalMinor
      interestMinor
      balanceAfterMinor
      status
    }
  }
}`,
            { id: "00000000-0000-0000-0000-000000000701" },
          ),
        },
      ],
      keyNotes: [
        "Each installment has a unique `scheduleInstallmentId` used for recording payments.",
      ],
    },
    {
      stepNumber: 3,
      title: "Pay Installment & Create Linked Money Transaction",
      summary: "Mark installment paid and record the expense in Money atomically.",
      explanation:
        "Use `loanInstallmentPayWithTransaction`. It marks the schedule installment paid, records `paidAt`, and inserts a corresponding expense transaction into your Money account in a single database transaction.",
      codeSamples: [
        {
          id: "loan-step3-pay-curl",
          label: "cURL (Pay with Money Transaction)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `mutation($input: LoanInstallmentPayWithTransactionInput!) {
  loanInstallmentPayWithTransaction(input: $input) {
    ok
    moneyTransactionId
  }
}`,
            {
              input: {
                scheduleInstallmentId: "00000000-0000-0000-0000-000000000750",
                accountId: "00000000-0000-0000-0000-000000000101",
                categoryId: "00000000-0000-0000-0000-000000000201",
                notes: "Car loan payment #1",
                occurredAt: "2025-01-15T09:00:00.000Z",
              },
            },
          ),
        },
      ],
      keyNotes: [
        "Returns the created `moneyTransactionId` linking both modules.",
        "If you already logged the payment manually and only want to update loan status, call `loanInstallmentMarkPaid` instead.",
      ],
    },
    {
      stepNumber: 4,
      title: "Cancel or Complete a Loan",
      summary: "Cancel an active loan when paid off or terminated early.",
      explanation:
        "Call `loanCancel(id: $id)` to mark a loan as cancelled, removing future reminders and recalculating insights totals.",
      codeSamples: [
        {
          id: "loan-step4-cancel-curl",
          label: "cURL (Cancel Loan)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `mutation($id: ID!) {
  loanCancel(id: $id) {
    ok
  }
}`,
            { id: "00000000-0000-0000-0000-000000000701" },
          ),
        },
      ],
      keyNotes: [
        "Cancelled loans remain in history for audit/insights but no longer show upcoming due notices.",
      ],
    },
  ],
  rulesAndGotchas: [
    {
      term: "Basis Points (`annualRateBps`)",
      explanation:
        "100 bps = 1.00%. For an 8.5% interest rate, pass `850`. For 12.25%, pass `1225`.",
    },
    {
      term: "BigInt Precision",
      explanation:
        "Loan balances and installments use `BigInt` under PostgreSQL to prevent precision loss across multi-year amortization schedules.",
    },
  ],
};

export const apiHelpInvestmentGuide: ApiHelpWorkflowGuide = {
  id: "guide-investments",
  title: "Adding Investment Activities via API",
  shortTitle: "Investment Activities",
  badge: "GraphQL & REST",
  badgeTone: "accent",
  description:
    "How to register instruments, record buy/sell/dividend/cash-move activities, close positions, and sync with cash accounts via GraphQL and REST.",
  prerequisites: [
    "API Token with write scope (`mny_...`).",
    "Instrument ID (or create one using `investmentInstrumentCreate`).",
    "Linked cash `moneyAccountId` for settled balances.",
  ],
  steps: [
    {
      stepNumber: 1,
      title: "Create or Query Financial Instruments",
      summary: "Register stock, crypto, forex, or commodity instruments.",
      explanation:
        "Activities require a parent instrument. Call `investmentInstrumentCreate` to register a symbol and link it to a Money cash account and categories.",
      codeSamples: [
        {
          id: "invest-step1-create-curl",
          label: "cURL (Create Instrument)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `mutation($input: InvestmentInstrumentCreateInput!) {
  investmentInstrumentCreate(input: $input) {
    id
    symbol
    name
    kind
    currency
  }
}`,
            {
              input: {
                symbol: "AAPL",
                name: "Apple Inc.",
                kind: "stock",
                currency: "USD",
                yahooSymbol: "AAPL",
                moneyAccountId: "00000000-0000-0000-0000-000000000101",
                incomeCategoryId: "00000000-0000-0000-0000-000000000201",
                expenseCategoryId: "00000000-0000-0000-0000-000000000202",
              },
            },
          ),
        },
      ],
      keyNotes: [
        "`kind`: `stock`, `crypto`, `forex`, `commodity`, or `fund`.",
        "`moneyAccountId`: Settlement account for buys/sells/dividends.",
      ],
    },
    {
      stepNumber: 2,
      title: "Log Activity via GraphQL (`BUY`, `SELL`, `DIVIDEND`)",
      summary: "Record trade executions or dividend cash inflows.",
      explanation:
        "Call `investmentActivityCreate`. Quantities are passed as strings to preserve full fractional precision without floating-point errors.",
      codeSamples: [
        {
          id: "invest-step2-buy-curl",
          label: "cURL (Log BUY Activity)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `mutation($input: InvestmentActivityCreateInput!) {
  investmentActivityCreate(input: $input) {
    id
    type
    quantity
    unitPriceMinor
    amountMinor
    activityDate
  }
}`,
            {
              input: {
                instrumentId: "00000000-0000-0000-0000-000000000601",
                activityDate: "2025-01-15T15:00:00.000Z",
                type: "BUY",
                quantity: "10.5",
                unitPriceMinor: 17500,
                amountMinor: 183750,
                notes: "Purchased 10.5 shares @ $175.00",
                moneyAccountId: "00000000-0000-0000-0000-000000000101",
              },
            },
          ),
        },
      ],
      keyNotes: [
        "`type`: `BUY`, `SELL`, `DIVIDEND`, `DEPOSIT`, `WITHDRAWAL`.",
        "`quantity`: Pass as string (e.g. `'0.054321'` or `'10'`).",
      ],
    },
    {
      stepNumber: 3,
      title: "Log Activity via REST Endpoint",
      summary: "Submit trades programmatically from automated bots or webhooks.",
      explanation:
        "If your workflow is an automated trading bot or webhook, hit `POST /api/investment/activities` directly with a JSON payload.",
      codeSamples: [
        {
          id: "invest-step3-rest-curl",
          label: "cURL (REST Activity Endpoint)",
          language: "bash",
          body: `curl -sS -X POST "${API_HELP_BASE_URL_PLACEHOLDER}/api/investment/activities" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "instrumentId": "00000000-0000-0000-0000-000000000601",
    "activityDate": "2025-01-20T10:00:00.000Z",
    "type": "BUY",
    "quantity": "5",
    "unitPriceMinor": 22000,
    "amountMinor": 110000,
    "notes": "Bot automated limit order"
  }'`,
        },
      ],
      keyNotes: [
        "Endpoint supports `GET /api/investment/activities` (filter by `instrumentId`, `from`, `to`, `limit`, `cursor`).",
      ],
    },
    {
      stepNumber: 4,
      title: "Close or Realize Positions",
      summary: "Close open lots and record realized profit & loss (P&L).",
      explanation:
        "Call `investmentActivityClose` or `investmentActivityRealize` with the exit price, fees, and optional FX conversion rate to settle the trade.",
      codeSamples: [
        {
          id: "invest-step4-close-curl",
          label: "cURL (Close Position)",
          language: "bash",
          body: buildGraphqlCurlExample(
            `mutation($input: InvestmentActivityCloseInput!) {
  investmentActivityClose(input: $input) {
    id
    status
    closePrice
  }
}`,
            {
              input: {
                id: "00000000-0000-0000-0000-000000000650",
                closePrice: "195.50",
                feeMinor: 200,
                activityDate: "2025-02-01T16:00:00.000Z",
              },
            },
          ),
        },
      ],
      keyNotes: [
        "Updates portfolio performance metrics and unrealized/realized P&L cards automatically.",
      ],
    },
  ],
  rulesAndGotchas: [
    {
      term: "Fractional Precision (String Quantities)",
      explanation:
        "Always pass quantities as string formatted decimals (e.g. `\"1.2345\"`) to prevent floating point inaccuracies.",
    },
    {
      term: "Currency & FX Rates",
      explanation:
        "When purchasing instruments in foreign currencies (e.g. USD asset in EUR workspace), provide `fxRate` during settlement.",
    },
  ],
};

export const apiHelpWorkflowGuides: ApiHelpWorkflowGuide[] = [
  apiHelpDataFetchGuide,
  apiHelpTransactionGuide,
  apiHelpLoanGuide,
  apiHelpInvestmentGuide,
];

/* -------------------------------------------------------------------------- */
/* GRAPHQL QUERIES CATALOG                                                    */
/* -------------------------------------------------------------------------- */

export const apiHelpGraphqlQueryExamples: ApiHelpGraphqlQueryExample[] = [
  // Money Queries
  {
    id: "query-moneyBootstrap",
    field: "moneyBootstrap",
    category: "money",
    tabLabel: "moneyBootstrap",
    operationKind: "query",
    summary:
      "Workspace bootstrap: active workspace, currency setup, workspace list, and reference data (accounts, categories, merchants, tags).",
    purpose:
      "Load the core Money workspace state in one request so a client can initialize its workspace picker and reference lists.",
    whenToUse:
      "Use this first after authentication when you need enough data to render the Money app shell or seed local state.",
    returns:
      "Workspace metadata plus accounts, categories, merchants, and tags for the active workspace.",
    usageNotes: [
      "Best first query after login or when switching to the Money product area.",
      "Useful when you want one bootstrap call instead of several smaller list queries.",
    ],
    query: `query {
  moneyBootstrap {
    workspaceId
    defaultCurrency
    needsCurrencySetup
    workspaces { id name kind isDefault }
    accounts
    categories
    tags
  }
}`,
  },
  {
    id: "query-moneyTransactions",
    field: "moneyTransactions",
    category: "money",
    tabLabel: "moneyTransactions",
    operationKind: "query",
    summary:
      "Paginated transaction list. Pass filters and paging in the query JSONObject; from/to must be ISO datetimes with timezone offsets.",
    purpose:
      "Fetch raw transaction rows with pagination, sorting, and optional filters.",
    whenToUse:
      "Use this for transaction tables, exports, drill-downs from analytics, or any workflow that needs individual records.",
    returns:
      "A paginated object containing data, total, page, and pageSize.",
    inputNotes: [
      "query.from and query.to must be ISO datetimes with timezone offsets.",
      "query.page, query.pageSize, query.sort, and query.dir control pagination and ordering.",
      "query.accountIds, categoryIds, merchantIds, tagIds, kinds, recurrence, and recurrenceSourceIds are optional filters.",
    ],
    usageNotes: [
      "A good pattern is to call moneyTransactions after moneyBootstrap so you can filter using known ids.",
    ],
    query: `query($query: JSONObject!) {
  moneyTransactions(query: $query) {
    data
    total
    page
    pageSize
  }
}`,
    variables: {
      query: {
        from: "2025-01-01T00:00:00.000Z",
        to: "2025-01-31T23:59:59.999Z",
        page: 1,
        pageSize: 50,
        sort: "occurredAt",
        dir: "desc",
      },
    },
  },
  {
    id: "query-moneyTransaction",
    field: "moneyTransaction",
    category: "money",
    tabLabel: "moneyTransaction(id)",
    operationKind: "query",
    summary: "Single transaction by id (JSONObject or null).",
    purpose:
      "Fetch one transaction record when you already know its id.",
    whenToUse:
      "Use this for a transaction details page or edit flow after a user selects a specific transaction.",
    returns:
      "A single transaction object, or null if the id is not found in the current workspace.",
    inputNotes: [
      "id must be a real transaction UUID from the current workspace.",
    ],
    usageNotes: [
      "A practical flow is: call moneyTransactions first, then reuse one returned id here.",
    ],
    query: `query($id: ID!) {
  moneyTransaction(id: $id)
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000001",
    },
  },
  {
    id: "query-moneyAccounts",
    field: "moneyAccounts",
    category: "money",
    tabLabel: "moneyAccounts",
    operationKind: "query",
    summary: "All accounts in the token workspace (JSONObject array).",
    purpose:
      "List every account in the current workspace.",
    whenToUse:
      "Use this to populate account pickers, reconcile imports, or inspect balances and account metadata.",
    returns:
      "A JSON array of account records for the active workspace.",
    usageNotes: [
      "Prefer this over moneyBootstrap if you only need accounts and want a smaller response.",
    ],
    query: `query {
  moneyAccounts
}`,
  },
  {
    id: "query-moneyCategories",
    field: "moneyCategories",
    category: "money",
    tabLabel: "moneyCategories",
    operationKind: "query",
    summary: "Category tree for the workspace (JSONObject array).",
    purpose:
      "List all categories in the current workspace, including hierarchy metadata.",
    whenToUse:
      "Use this for category filters, transaction editors, or category-management tools.",
    returns:
      "A JSON array of category records for the active workspace.",
    query: `query {
  moneyCategories
}`,
  },
  {
    id: "query-moneyMerchants",
    field: "moneyMerchants",
    category: "money",
    tabLabel: "moneyMerchants",
    operationKind: "query",
    summary: "Merchants list (JSONObject array).",
    purpose:
      "List merchants available in the current workspace.",
    whenToUse:
      "Use this for merchant filters, rule builders, import mapping, or transaction edit forms.",
    returns:
      "A JSON array of merchant records.",
    query: `query {
  moneyMerchants
}`,
  },
  {
    id: "query-moneyTags",
    field: "moneyTags",
    category: "money",
    tabLabel: "moneyTags",
    operationKind: "query",
    summary: "Tags list (JSONObject array).",
    purpose:
      "List tags defined in the current workspace.",
    whenToUse:
      "Use this for tag filters, transaction tagging, and reporting by tag.",
    returns:
      "A JSON array of tag records.",
    query: `query {
  moneyTags
}`,
  },
  {
    id: "query-moneyAnalytics",
    field: "moneyAnalyticsSummary",
    category: "money",
    tabLabel: "moneyAnalyticsSummary",
    operationKind: "query",
    summary:
      "Analytics summary payload for an ISO datetime range and optional filters.",
    purpose:
      "Fetch aggregated analytics totals, spend trends, and category distribution.",
    whenToUse:
      "Use this for dashboards and summary reporting.",
    returns:
      "A JSON analytics payload.",
    query: `query($filters: AnalyticsFiltersInput!) {
  moneyAnalyticsSummary(filters: $filters)
}`,
    variables: {
      filters: {
        from: "2025-01-01T00:00:00.000Z",
        to: "2025-12-31T23:59:59.999Z",
      },
    },
  },

  // Loans Queries
  {
    id: "query-loansBootstrap",
    field: "loansBootstrap",
    category: "loans",
    tabLabel: "loansBootstrap",
    operationKind: "query",
    summary: "Bootstrap Loans workspace, default currency, and overdue payment count.",
    purpose: "Initialize loans dashboard and notification badges.",
    whenToUse: "Call on app boot or before listing loans.",
    returns: "LoansBootstrapPayload object.",
    query: `query {
  loansBootstrap {
    workspaceId
    defaultCurrency
    dueCount
    workspaces { id name isDefault }
  }
}`,
  },
  {
    id: "query-loans",
    field: "loans",
    category: "loans",
    tabLabel: "loans",
    operationKind: "query",
    summary: "List all active and completed loans in the current workspace.",
    purpose: "Fetch loan summary rows with remaining balances, next due dates, and progress percentages.",
    whenToUse: "Use for loan list pages, debt overview widgets, or audit exports.",
    returns: "Array of LoanListItem objects.",
    query: `query {
  loans {
    id
    name
    currency
    principalMinor
    annualRateBps
    termMonths
    status
    percentComplete
    remainingMinor
    nextDueDate
  }
}`,
  },
  {
    id: "query-loan",
    field: "loan",
    category: "loans",
    tabLabel: "loan(id)",
    operationKind: "query",
    summary: "Detailed loan view with full amortization installment schedule and summary stats.",
    purpose: "Retrieve complete breakdown of every scheduled payment, interest split, and payoff projection.",
    whenToUse: "Use for loan detail screens, schedule verification, or payment tracking.",
    returns: "LoanDetail object with installments and chart points.",
    query: `query($id: ID!) {
  loan(id: $id) {
    id
    name
    status
    principalMinor
    remainingMinor
    percentComplete
    summary {
      totalPaidMinor
      remainingMinor
      monthsAheadBehind
      projectedPayoffDate
    }
    installments {
      scheduleInstallmentId
      installmentNumber
      dueDate
      paymentMinor
      principalMinor
      interestMinor
      balanceAfterMinor
      status
      paidAt
    }
  }
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000701",
    },
  },
  {
    id: "query-loansDueInstallments",
    field: "loansDueInstallments",
    category: "loans",
    tabLabel: "loansDueInstallments",
    operationKind: "query",
    summary: "List all due and overdue loan installments across the workspace.",
    purpose: "Provide actionable reminders for upcoming payments that require settlement.",
    whenToUse: "Use for payment notification feeds, reminder banners, or automated billing queues.",
    returns: "Array of LoanDueInstallment objects.",
    query: `query {
  loansDueInstallments {
    scheduleInstallmentId
    loanId
    loanName
    installmentNumber
    dueDate
    paymentMinor
    currency
    moneyAccountId
    moneyCategoryId
  }
}`,
  },

  // Investments Queries
  {
    id: "query-investmentBootstrap",
    field: "investmentBootstrap",
    category: "investments",
    tabLabel: "investmentBootstrap",
    operationKind: "query",
    summary: "Initialize investment workspace state and active instrument count.",
    purpose: "Load workspace currency and instrument summary.",
    whenToUse: "Use on investment app initialization.",
    returns: "InvestmentBootstrapPayload.",
    query: `query {
  investmentBootstrap {
    workspaceId
    defaultCurrency
    instrumentCount
  }
}`,
  },
  {
    id: "query-investmentInstruments",
    field: "investmentInstruments",
    category: "investments",
    tabLabel: "investmentInstruments",
    operationKind: "query",
    summary: "List registered financial instruments (stocks, crypto, commodities, forex).",
    purpose: "Retrieve instrument symbols, linked cash accounts, and categories.",
    whenToUse: "Use to populate instrument selectors or portfolio asset lists.",
    returns: "Array of InvestmentInstrument objects.",
    query: `query {
  investmentInstruments {
    id
    symbol
    name
    kind
    currency
    yahooSymbol
    moneyAccountId
    archived
  }
}`,
  },
  {
    id: "query-investmentActivities",
    field: "investmentActivities",
    category: "investments",
    tabLabel: "investmentActivities",
    operationKind: "query",
    summary: "Query paginated investment activities with date and instrument filters.",
    purpose: "Retrieve trading activity log, buy/sell executions, and dividend history.",
    whenToUse: "Use for trade ledgers, activity histories, and performance audits.",
    returns: "InvestmentActivitiesConnection object with items and nextCursor.",
    query: `query($query: InvestmentActivitiesQueryInput) {
  investmentActivities(query: $query) {
    items {
      id
      instrumentSymbol
      instrumentName
      type
      quantity
      unitPriceMinor
      amountMinor
      activityDate
      status
    }
    nextCursor
  }
}`,
    variables: {
      query: {
        from: "2025-01-01",
        to: "2025-12-31",
        limit: 50,
      },
    },
  },
];

/* -------------------------------------------------------------------------- */
/* GRAPHQL MUTATIONS CATALOG                                                  */
/* -------------------------------------------------------------------------- */

export const apiHelpGraphqlMutationExamples: ApiHelpGraphqlQueryExample[] = [
  // Money Mutations
  {
    id: "mutation-moneyTransactionCreate-expense",
    field: "moneyTransactionCreate",
    category: "money",
    tabLabel: "Transaction (expense)",
    operationKind: "mutation",
    summary: "Create an expense transaction in the active workspace.",
    purpose:
      "Insert a new expense manually or from an automation script.",
    whenToUse:
      "Use this when money leaves an account (purchases, bills, fees).",
    returns: "The created transaction as JSON.",
    inputNotes: [
      "accountId and amountMinor are required.",
      "kind defaults to expense when omitted.",
      "occurredAt should be an ISO datetime with timezone offset when provided.",
      "categoryId, merchantId, tagIds, and tagNames are optional.",
    ],
    query: `mutation($input: MoneyTransactionCreateInput!) {
  moneyTransactionCreate(input: $input)
}`,
    variables: {
      input: {
        accountId: "00000000-0000-0000-0000-000000000101",
        kind: "expense",
        amountMinor: 2599,
        occurredAt: "2025-01-15T12:00:00.000Z",
        notes: "Coffee & breakfast",
      },
    },
  },
  {
    id: "mutation-moneyTransactionCreate-income",
    field: "moneyTransactionCreate",
    category: "money",
    tabLabel: "Transaction (income)",
    operationKind: "mutation",
    summary: "Create an income transaction in the active workspace.",
    purpose:
      "Insert a new income event manually or from an automation script.",
    whenToUse:
      "Use this when money enters an account (salary, refunds, interest).",
    returns: "The created transaction as JSON.",
    inputNotes: [
      "accountId and amountMinor are required.",
      "Set kind to income.",
      "occurredAt should be an ISO datetime with timezone offset when provided.",
      "categoryId, merchantId, tagIds, and tagNames are optional.",
    ],
    query: `mutation($input: MoneyTransactionCreateInput!) {
  moneyTransactionCreate(input: $input)
}`,
    variables: {
      input: {
        accountId: "00000000-0000-0000-0000-000000000101",
        kind: "income",
        amountMinor: 350000,
        occurredAt: "2025-01-31T09:00:00.000Z",
        notes: "Monthly Paycheck",
      },
    },
  },
  {
    id: "mutation-moneyTransactionCreate-transfer",
    field: "moneyTransactionCreate",
    category: "money",
    tabLabel: "Transaction (transfer)",
    operationKind: "mutation",
    summary:
      "Move money between two accounts in the active workspace (paired out/in legs).",
    purpose:
      "Record a transfer from one account to another without treating it as expense or income.",
    whenToUse:
      "Use this when moving funds between your own accounts (e.g. checking to savings).",
    returns:
      "The created out-leg transaction as JSON (a matching in-leg is created automatically).",
    inputNotes: [
      "accountId is the source account; toAccountId is the destination (both required).",
      "toAccountId must be a different account in the same workspace.",
      "Set kind to transfer.",
      "amountMinor is the amount moved (positive integer in minor units).",
    ],
    query: `mutation($input: MoneyTransactionCreateInput!) {
  moneyTransactionCreate(input: $input)
}`,
    variables: {
      input: {
        accountId: "00000000-0000-0000-0000-000000000101",
        toAccountId: "00000000-0000-0000-0000-000000000102",
        kind: "transfer",
        amountMinor: 50000,
        occurredAt: "2025-01-15T12:00:00.000Z",
        notes: "Move to savings",
      },
    },
  },
  {
    id: "mutation-moneyTransactionCreate-recurring",
    field: "moneyTransactionCreate",
    category: "money",
    tabLabel: "Transaction (recurring)",
    operationKind: "mutation",
    summary:
      "Create a transaction and attach a recurrence schedule in one request.",
    purpose:
      "Post the first entry immediately and save a template for future scheduled runs.",
    whenToUse:
      "Use this for rent, salary, subscriptions, or other repeating expenses and income.",
    returns:
      "The created transaction as JSON, linked to a new recurrence template.",
    query: `mutation($input: MoneyTransactionCreateInput!) {
  moneyTransactionCreate(input: $input)
}`,
    variables: {
      input: {
        accountId: "00000000-0000-0000-0000-000000000101",
        kind: "expense",
        amountMinor: 120000,
        occurredAt: "2025-02-01T00:00:00.000Z",
        categoryId: "00000000-0000-0000-0000-000000000201",
        notes: "Apartment rent",
        recurrence: {
          cadence: "monthly",
          name: "Monthly rent",
        },
      },
    },
  },
  {
    id: "mutation-moneyTransactionUpdate",
    field: "moneyTransactionUpdate",
    category: "money",
    tabLabel: "Transaction update",
    operationKind: "mutation",
    summary: "Update an existing transaction.",
    purpose:
      "Correct or enrich a transaction after it has already been recorded.",
    whenToUse:
      "Use this to change notes, merchant, category, tags, or amounts.",
    returns: "The updated transaction as JSON.",
    query: `mutation($id: ID!, $input: MoneyTransactionUpdateInput!) {
  moneyTransactionUpdate(id: $id, input: $input)
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000801",
      input: {
        notes: "Coffee with client",
      },
    },
  },
  {
    id: "mutation-moneyTransactionDelete",
    field: "moneyTransactionDelete",
    category: "money",
    tabLabel: "Transaction delete",
    operationKind: "mutation",
    summary: "Delete a transaction.",
    purpose:
      "Remove a transaction that was created by mistake or should no longer exist.",
    whenToUse:
      "Use this when correcting duplicate or invalid data.",
    returns: "{ ok: true } when deletion succeeds.",
    query: `mutation($id: ID!) {
  moneyTransactionDelete(id: $id) {
    ok
  }
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000801",
    },
  },
  {
    id: "mutation-moneyAccountCreate",
    field: "moneyAccountCreate",
    category: "money",
    tabLabel: "Account create",
    operationKind: "mutation",
    summary: "Create a new account in the active workspace.",
    purpose:
      "Add a trackable account such as checking, savings, credit, or cash.",
    whenToUse:
      "Use this before importing transactions or when onboarding a new financial account.",
    returns: "The created account record as JSON.",
    query: `mutation($input: MoneyAccountCreateInput!) {
  moneyAccountCreate(input: $input)
}`,
    variables: {
      input: {
        name: "Emergency Fund",
        type: "savings",
        balanceMinor: 500000,
      },
    },
  },
  {
    id: "mutation-moneyCategoryCreate",
    field: "moneyCategoryCreate",
    category: "money",
    tabLabel: "Category create",
    operationKind: "mutation",
    summary: "Create a category for income or expense classification.",
    purpose:
      "Add a category so transactions and rules can classify money movement.",
    whenToUse:
      "Use this during workspace setup or when adding a new spending or income bucket.",
    returns: "The created category record as JSON.",
    query: `mutation($input: MoneyCategoryCreateInput!) {
  moneyCategoryCreate(input: $input)
}`,
    variables: {
      input: {
        name: "Groceries",
        kind: "expense",
      },
    },
  },

  // Loans Mutations
  {
    id: "mutation-loanCreate",
    field: "loanCreate",
    category: "loans",
    tabLabel: "loanCreate",
    operationKind: "mutation",
    summary: "Create an amortized loan and compute schedule installments.",
    purpose: "Register a loan with principal, annualRateBps, termMonths, and payment due day.",
    whenToUse: "Use when taking on a new mortgage, car loan, or personal loan.",
    returns: "LoanCreateResult with created loan ID.",
    query: `mutation($input: LoanCreateInput!) {
  loanCreate(input: $input) {
    id
  }
}`,
    variables: {
      input: {
        name: "Auto Loan",
        principalMinor: 2000000,
        annualRateBps: 799,
        termMonths: 48,
        startDate: "2025-01-01",
        dueDayOfMonth: 15,
      },
    },
  },
  {
    id: "mutation-loanInstallmentPayWithTransaction",
    field: "loanInstallmentPayWithTransaction",
    category: "loans",
    tabLabel: "loanInstallmentPayWithTransaction",
    operationKind: "mutation",
    summary: "Mark loan installment paid and record a Money expense transaction atomically.",
    purpose: "Record loan repayment and debit account balance in one atomic database operation.",
    whenToUse: "Use when paying loan installments from your cash or checking account.",
    returns: "LoanPayWithTransactionResult with created moneyTransactionId.",
    query: `mutation($input: LoanInstallmentPayWithTransactionInput!) {
  loanInstallmentPayWithTransaction(input: $input) {
    ok
    moneyTransactionId
  }
}`,
    variables: {
      input: {
        scheduleInstallmentId: "00000000-0000-0000-0000-000000000750",
        accountId: "00000000-0000-0000-0000-000000000101",
        notes: "Monthly auto payment",
      },
    },
  },
  {
    id: "mutation-loanInstallmentMarkPaid",
    field: "loanInstallmentMarkPaid",
    category: "loans",
    tabLabel: "loanInstallmentMarkPaid",
    operationKind: "mutation",
    summary: "Mark loan installment paid without creating a Money transaction.",
    purpose: "Update repayment schedule status when payment was logged elsewhere or paid externally.",
    whenToUse: "Use for historical catch-up or standalone loan tracking.",
    returns: "LoansOk object.",
    query: `mutation($input: LoanInstallmentMarkPaidInput!) {
  loanInstallmentMarkPaid(input: $input) {
    ok
  }
}`,
    variables: {
      input: {
        scheduleInstallmentId: "00000000-0000-0000-0000-000000000750",
      },
    },
  },
  {
    id: "mutation-loanCancel",
    field: "loanCancel",
    category: "loans",
    tabLabel: "loanCancel",
    operationKind: "mutation",
    summary: "Cancel an active loan schedule.",
    purpose: "Terminate loan reminders and early payoff calculations.",
    whenToUse: "Use when refinancing, closing, or cancelling a loan.",
    returns: "LoansOk object.",
    query: `mutation($id: ID!) {
  loanCancel(id: $id) {
    ok
  }
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000701",
    },
  },

  // Investment Mutations
  {
    id: "mutation-investmentInstrumentCreate",
    field: "investmentInstrumentCreate",
    category: "investments",
    tabLabel: "instrumentCreate",
    operationKind: "mutation",
    summary: "Register a financial instrument (stock, crypto, commodity).",
    purpose: "Setup target instrument ticker, currency, and settlement account.",
    whenToUse: "Use before recording trades or importing brokerage activities.",
    returns: "Created InvestmentInstrument object.",
    query: `mutation($input: InvestmentInstrumentCreateInput!) {
  investmentInstrumentCreate(input: $input) {
    id
    symbol
    name
    kind
    currency
  }
}`,
    variables: {
      input: {
        symbol: "MSFT",
        name: "Microsoft Corp.",
        kind: "stock",
        currency: "USD",
        moneyAccountId: "00000000-0000-0000-0000-000000000101",
        incomeCategoryId: "00000000-0000-0000-0000-000000000201",
        expenseCategoryId: "00000000-0000-0000-0000-000000000202",
      },
    },
  },
  {
    id: "mutation-investmentActivityCreate",
    field: "investmentActivityCreate",
    category: "investments",
    tabLabel: "activityCreate",
    operationKind: "mutation",
    summary: "Record trade execution (BUY, SELL, DIVIDEND, DEPOSIT).",
    purpose: "Log buy/sell transactions and update portfolio holdings.",
    whenToUse: "Use when executing trades or receiving dividend yields.",
    returns: "InvestmentActivityRow object.",
    query: `mutation($input: InvestmentActivityCreateInput!) {
  investmentActivityCreate(input: $input) {
    id
    type
    quantity
    unitPriceMinor
    amountMinor
    activityDate
  }
}`,
    variables: {
      input: {
        instrumentId: "00000000-0000-0000-0000-000000000601",
        activityDate: "2025-01-20T14:30:00.000Z",
        type: "BUY",
        quantity: "25",
        unitPriceMinor: 41500,
        amountMinor: 1037500,
        notes: "Long position entry",
      },
    },
  },
  {
    id: "mutation-investmentActivityClose",
    field: "investmentActivityClose",
    category: "investments",
    tabLabel: "activityClose",
    operationKind: "mutation",
    summary: "Close open trading activity and record final exit price and fee.",
    purpose: "Realize gain/loss and update open lots count.",
    whenToUse: "Use when taking profit or stopping out of an open trade.",
    returns: "InvestmentActivityRow object.",
    query: `mutation($input: InvestmentActivityCloseInput!) {
  investmentActivityClose(input: $input) {
    id
    status
    closePrice
  }
}`,
    variables: {
      input: {
        id: "00000000-0000-0000-0000-000000000650",
        closePrice: "430.00",
        feeMinor: 150,
      },
    },
  },
];

/* -------------------------------------------------------------------------- */
/* REST APIS CATALOG                                                          */
/* -------------------------------------------------------------------------- */

export const apiHelpRestApiExamples: ApiHelpRestExample[] = [
  {
    id: "rest-import-direct-transactions",
    tabLabel: "Direct Transactions Import",
    category: "money",
    method: "POST",
    path: "/api/money/import/transactions",
    auth: "Bearer + write",
    summary: "Create multiple transaction rows directly from a JSON payload.",
    purpose:
      "Direct bulk ingestion of validated transactions without CSV parsing or preview staging.",
    whenToUse:
      "Use this for automation scripts, bank scraper integrations, or bulk migrations.",
    returns: "JSON { data: { created: number } }",
    inputNotes: [
      "Send { rows: Array<{ accountId, kind, amountMinor, occurredAt, notes, categoryId }> } in request body.",
    ],
    codeSample: {
      id: "rest-import-direct-tx-sample",
      label: "Direct transactions import cURL",
      language: "bash",
      body: `curl -sS -X POST "${API_HELP_BASE_URL_PLACEHOLDER}/api/money/import/transactions" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "rows": [
      {
        "accountId": "00000000-0000-0000-0000-000000000101",
        "kind": "expense",
        "amountMinor": 2500,
        "occurredAt": "2025-01-15T12:00:00.000Z",
        "notes": "Office supplies"
      }
    ]
  }'`,
    },
  },
  {
    id: "rest-investment-activities-post",
    tabLabel: "Investment Activity (Create)",
    category: "investments",
    method: "POST",
    path: "/api/investment/activities",
    auth: "Bearer + write",
    summary: "Create an investment activity record via REST.",
    purpose:
      "Submit trade orders, dividend receipts, or deposits from external automated bots or webhook scripts.",
    whenToUse:
      "Use when automating trade sync from external brokerages or algorithmic trading runners.",
    returns: "JSON { data: InvestmentActivityRow }",
    inputNotes: [
      "Requires instrumentId, activityDate, type (BUY, SELL, etc.), and amountMinor or unitPriceMinor/quantity.",
    ],
    codeSample: {
      id: "rest-invest-post-sample",
      label: "Create activity cURL",
      language: "bash",
      body: `curl -sS -X POST "${API_HELP_BASE_URL_PLACEHOLDER}/api/investment/activities" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "instrumentId": "00000000-0000-0000-0000-000000000601",
    "activityDate": "2025-01-20T10:00:00.000Z",
    "type": "BUY",
    "quantity": "10",
    "unitPriceMinor": 15000,
    "amountMinor": 150000,
    "notes": "Webhook trade execution"
  }'`,
    },
  },
  {
    id: "rest-investment-activities-get",
    tabLabel: "Investment Activities (List)",
    category: "investments",
    method: "GET",
    path: "/api/investment/activities",
    auth: "Bearer + read",
    summary: "Query investment activities with query parameters.",
    purpose:
      "Retrieve a filtered list of trade activities via REST.",
    whenToUse:
      "Use for REST clients that need trade ledgers without sending GraphQL queries.",
    returns: "JSON { data: { items: InvestmentActivityRow[], nextCursor?: string } }",
    inputNotes: [
      "Optional query params: instrumentId, kind, from, to, limit, cursor.",
    ],
    codeSample: {
      id: "rest-invest-get-sample",
      label: "List activities cURL",
      language: "bash",
      body: `curl -sS "${API_HELP_BASE_URL_PLACEHOLDER}/api/investment/activities?limit=20" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN"`,
    },
  },
  {
    id: "rest-import-preview",
    tabLabel: "CSV Import Preview",
    category: "money",
    method: "POST",
    path: "/api/money/import/preview",
    auth: "Bearer + write",
    summary: "Upload a CSV file and get a preview with previewId, rows, warnings, and errors.",
    purpose:
      "Validate and inspect import rows before committing them.",
    whenToUse:
      "Use this first in any CSV import workflow.",
    returns: "JSON preview payload with previewId, parsed rows, and validation feedback.",
    codeSample: {
      id: "rest-import-preview-sample",
      label: "Bearer token example",
      language: "bash",
      body: `curl -sS "${API_HELP_BASE_URL_PLACEHOLDER}/api/money/import/preview" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -F "type=transactions" \\
  -F "file=@transactions.csv"`,
    },
  },
  {
    id: "rest-import-commit",
    tabLabel: "CSV Import Commit",
    category: "money",
    method: "POST",
    path: "/api/money/import/commit",
    auth: "Bearer + write",
    summary: "Commit a previously previewed import or send validated rows directly.",
    purpose:
      "Persist imported data after preview validation is complete.",
    whenToUse:
      "Use this right after a successful preview when you are ready to create records.",
    returns: "JSON { data: { imported: number } }",
    codeSample: {
      id: "rest-import-commit-sample",
      label: "Commit by previewId",
      language: "bash",
      body: `curl -sS "${API_HELP_BASE_URL_PLACEHOLDER}/api/money/import/commit" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"transactions","previewId":"00000000-0000-0000-0000-000000000901"}'`,
    },
  },
  {
    id: "rest-tokens-list",
    tabLabel: "API Tokens (List)",
    category: "tokens",
    method: "GET",
    path: "/api/tokens",
    auth: "Session only",
    summary: "List API tokens owned by the signed-in user.",
    purpose:
      "Show token metadata such as key prefix, scopes, workspace, and last-used timestamps.",
    whenToUse:
      "Use this in account settings or internal admin views tied to the user's browser session.",
    returns: "JSON { data: ApiTokenListItem[] }.",
    codeSample: {
      id: "rest-tokens-list-sample",
      label: "Browser session example",
      language: "javascript",
      body: buildSessionFetchExample("/api/tokens"),
    },
  },
  {
    id: "rest-tokens-create",
    tabLabel: "API Tokens (Create)",
    category: "tokens",
    method: "POST",
    path: "/api/tokens",
    auth: "Session only",
    summary: "Create a new API token and reveal the secret once.",
    purpose:
      "Issue a personal API token bound to a single Money workspace.",
    whenToUse:
      "Use this when preparing automation, scripts, or Postman collections.",
    returns: "JSON with the one-time token secret and token metadata.",
    codeSample: {
      id: "rest-tokens-create-sample",
      label: "Browser session example",
      language: "javascript",
      body: buildSessionFetchExample("/api/tokens", {
        method: "POST",
        body: {
          name: "Automation runner",
          workspaceId: "00000000-0000-0000-0000-000000000010",
          scopes: ["read", "write"],
        },
      }),
    },
  },
];

/* -------------------------------------------------------------------------- */
/* SECTIONS DEFINITIONS                                                       */
/* -------------------------------------------------------------------------- */

export const apiHelpSteps: ApiHelpStep[] = [
  { step: 1, label: "Overview", sectionId: "overview" },
  { step: 2, label: "Create an API token", sectionId: "token" },
  { step: 3, label: "Authenticate requests", sectionId: "auth" },
  { step: 4, label: "Practical guides", sectionId: "guides" },
  { step: 5, label: "GraphQL queries", sectionId: "graphql-query" },
  { step: 6, label: "GraphQL mutations", sectionId: "graphql-mutate" },
  { step: 7, label: "GraphQL schema & Postman", sectionId: "graphql-schema" },
  { step: 8, label: "REST APIs", sectionId: "rest-import" },
  { step: 9, label: "Errors", sectionId: "errors" },
  { step: 10, label: "Security", sectionId: "security" },
];

export const apiHelpSections: ApiHelpSection[] = [
  {
    id: "overview",
    title: "Overview",
    description:
      "The app exposes GraphQL as the primary unified API across Money, Loans, and Investments, accompanied by REST endpoints for direct ingestion and token management. Browser users authenticate via session cookies; scripts and automation tools use personal Bearer tokens.",
    bullets: [
      "Unified GraphQL endpoint: POST /api/graphql (POST & GET supported via GraphQL Yoga)",
      "REST Endpoints: Direct bulk JSON imports (/api/money/import/{kind}) and investment activity stream (/api/investment/activities)",
      "Base URL: your app origin (e.g. http://localhost:3000 in local development)",
    ],
  },
  {
    id: "token",
    title: "1. Create an API Token",
    description:
      "Sign in to the web app, then generate a token bound to your target workspace. Copy the secret immediately upon creation — it begins with mny_ and is shown only once.",
    bullets: [
      "Go to Settings → API tokens and select your workspace",
      "Enable write scope if you need to create transactions, loans, or investments",
      "Token routes (/api/tokens) require a browser session; tokens cannot create other tokens",
    ],
  },
  {
    id: "auth",
    title: "2. Authenticate Requests",
    description:
      "Pass your Bearer token in the standard HTTP Authorization header on every GraphQL and REST request. Because each token is bound to a workspace upon creation, no extra workspace cookie is required.",
    codeSamples: [
      {
        id: "auth-header",
        label: "HTTP Authorization Header",
        language: "http",
        body: "Authorization: Bearer mny_YOUR_TOKEN",
      },
    ],
    scopeTable: [
      { scope: "read", allows: "GraphQL queries, read-only REST endpoints" },
      {
        scope: "write",
        allows: "GraphQL mutations, transaction/loan creation, CSV and direct REST imports",
      },
    ],
  },
  {
    id: "graphql-schema",
    title: "GraphQL Schema & Postman",
    description:
      "Export the complete GraphQL schema directly from the repository root, then import it into Postman, Insomnia, or your favorite GraphQL IDE.",
    codeSamples: [
      {
        id: "export-schema",
        label: "Export schema (from repo root)",
        language: "bash",
        body: "npm run api:export-schema\n# → docs/money.graphql",
      },
    ],
    bullets: [
      "Postman: Click Import → Select docs/money.graphql, then set Authorization → Bearer Token",
      "OpenAPI spec for REST import endpoints: docs/openapi.yaml",
    ],
  },
  {
    id: "errors",
    title: "Error Handling & Status Codes",
    description:
      "REST routes return standardized JSON error envelopes. GraphQL responses return errors in the standard errors array with machine-readable extensions.code strings.",
    codeSamples: [
      {
        id: "rest-error",
        label: "REST error envelope",
        language: "json",
        body: '{ "error": "Human readable message", "code": "unauthorized" }',
      },
      {
        id: "gql-error",
        label: "GraphQL error envelope",
        language: "json",
        body: `{
  "errors": [
    {
      "message": "Token lacks write scope",
      "extensions": { "code": "FORBIDDEN" }
    }
  ]
}`,
      },
    ],
    bullets: [
      "HTTP Statuses: 401 (Unauthorized token), 403 (Missing scope/workspace access), 400 (Validation failed), 404 (Not found), 503 (Database unreachable)",
      "Extensions codes: UNAUTHORIZED, FORBIDDEN, BAD_REQUEST, NOT_FOUND, DB_UNAVAILABLE",
    ],
  },
  {
    id: "security",
    title: "Security Best Practices",
    description:
      "Treat API tokens with the same sensitivity as passwords. Never commit secrets to version control or hardcode them in public repositories.",
    bullets: [
      "Always use HTTPS in production environments",
      "Use read-only tokens for reporting and export scripts whenever possible",
      "Revoke compromised tokens immediately in Settings → API tokens",
      "Set optional token expiration dates for automated CI or short-lived jobs",
    ],
  },
];

export function resolveApiHelpSampleBody(
  body: string,
  baseUrl: string,
): string {
  return body.replaceAll(API_HELP_BASE_URL_PLACEHOLDER, baseUrl);
}
