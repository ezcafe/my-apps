export type ApiHelpSectionId =
  | "overview"
  | "token"
  | "auth"
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

export const apiHelpGraphqlQueryExamples: ApiHelpGraphqlQueryExample[] = [
  {
    id: "query-moneyBootstrap",
    field: "moneyBootstrap",
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
    merchants
    tags
  }
}`,
  },
  {
    id: "query-moneyAnalytics",
    field: "moneyAnalytics",
    operationKind: "query",
    summary:
      "Analytics payload for an ISO datetime range and optional filters (accounts, categories, merchants, tags, transaction kinds). Returns JSONObject.",
    purpose:
      "Fetch aggregated analytics data for charts, totals, category breakdowns, and trend views.",
    whenToUse:
      "Use this for dashboards and reporting screens where you care about summarized numbers, not individual transactions.",
    returns:
      "A JSON analytics payload used by the Money analytics UI.",
    inputNotes: [
      "filters.from and filters.to must be ISO datetimes with timezone offsets.",
      "accountIds, categoryIds, merchantIds, tagIds, kinds, recurrence, and recurrenceSourceIds are optional filters.",
    ],
    usageNotes: [
      "Start with only from/to, then add optional filters as needed.",
    ],
    query: `query($filters: AnalyticsFiltersInput!) {
  moneyAnalytics(filters: $filters)
}`,
    variables: {
      filters: {
        from: "2025-01-01T00:00:00.000Z",
        to: "2025-12-31T23:59:59.999Z",
      },
    },
  },
  {
    id: "query-moneyBudgets",
    field: "moneyBudgets",
    operationKind: "query",
    summary:
      "Budget rows for a period. Set includeSpent to include spent amounts in the response.",
    purpose:
      "Read configured budgets, optionally enriched with spent totals for a reporting period.",
    whenToUse:
      "Use this when you want budget configuration alone or a budget-vs-spend view for a date range.",
    returns:
      "A list of budget rows; with includeSpent enabled, rows also include spent and progress fields.",
    inputNotes: [
      "includeSpent controls whether spent totals are calculated.",
      "from and to should be ISO datetimes when you want a bounded spend range.",
    ],
    usageNotes: [
      "If you only need budget definitions, set includeSpent to false and omit from/to.",
    ],
    query: `query($includeSpent: Boolean!, $from: String!, $to: String!) {
  moneyBudgets(includeSpent: $includeSpent, from: $from, to: $to)
}`,
    variables: {
      includeSpent: true,
      from: "2025-01-01T00:00:00.000Z",
      to: "2025-12-31T23:59:59.999Z",
    },
  },
  {
    id: "query-moneyTransactions",
    field: "moneyTransactions",
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
    id: "query-moneyAccounts",
    field: "moneyAccounts",
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
    id: "query-moneyRules",
    field: "moneyRules",
    operationKind: "query",
    summary: "Categorization rules (JSONObject array).",
    purpose:
      "Read the workspace's rule set for automatic categorization and tagging.",
    whenToUse:
      "Use this when building rule management screens or debugging how imported transactions get categorized.",
    returns:
      "A JSON array of rule records.",
    query: `query {
  moneyRules
}`,
  },
  {
    id: "query-moneyRecurrenceTemplates",
    field: "moneyRecurrenceTemplates",
    operationKind: "query",
    summary: "Recurring transaction templates (JSONObject array).",
    purpose:
      "List recurrence templates used to generate scheduled transactions.",
    whenToUse:
      "Use this for recurring-payment settings, reminders, or schedule review screens.",
    returns:
      "A JSON array of recurrence template records.",
    query: `query {
  moneyRecurrenceTemplates
}`,
  },
  {
    id: "query-moneyTransaction",
    field: "moneyTransaction",
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
    id: "query-moneyParseCsv",
    field: "moneyParseCsv",
    operationKind: "query",
    summary:
      "Parse CSV text into headers and rows for import mapping (JSONObject).",
    purpose:
      "Parse raw CSV text so you can inspect headers and rows before mapping or importing data.",
    whenToUse:
      "Use this in import tooling or when validating a CSV file before hitting the import endpoints.",
    returns:
      "A JSON object containing parsed headers, rows, and truncation metadata.",
    inputNotes: [
      "Pass the entire CSV document as a string.",
    ],
    usageNotes: [
      "This is useful for previewing CSV structure before using the REST import endpoints.",
    ],
    query: `query($csv: String!) {
  moneyParseCsv(csv: $csv)
}`,
    variables: {
      csv: "name,type\nChecking,checking\nSavings,savings",
    },
  },
];

export const apiHelpGraphqlMutationExamples: ApiHelpGraphqlQueryExample[] = [
  {
    id: "mutation-moneySetActiveWorkspace",
    field: "moneySetActiveWorkspace",
    tabLabel: "Set active workspace",
    operationKind: "mutation",
    summary: "Switch the active Money workspace for the current browser session.",
    purpose:
      "Update the active workspace selection and refresh the workspace cookie used by the web app.",
    whenToUse:
      "Use this when a signed-in user changes workspaces in the UI.",
    returns: "Boolean true on success.",
    inputNotes: [
      "Requires a browser session. API tokens are blocked for this mutation.",
      "workspaceId must be a workspace the current user can access.",
    ],
    usageNotes: [
      "This is mainly for first-party UI flows, not automation scripts.",
    ],
    badges: [{ label: "Session only", tone: "muted" }],
    query: `mutation($workspaceId: ID!) {
  moneySetActiveWorkspace(workspaceId: $workspaceId, app: "money")
}`,
    variables: {
      workspaceId: "00000000-0000-0000-0000-000000000010",
    },
  },
  {
    id: "mutation-moneyWorkspaceCurrency",
    field: "moneyWorkspaceCurrency",
    tabLabel: "Set workspace currency",
    operationKind: "mutation",
    summary: "Set the default currency for a workspace.",
    purpose:
      "Configure or update the workspace default currency used across Money views.",
    whenToUse:
      "Use this during workspace setup or when an admin changes the workspace currency.",
    returns: "The patched workspaceId and defaultCurrency.",
    inputNotes: [
      "Requires write scope and access to the target workspace.",
      "defaultCurrency should be an ISO currency code such as USD or EUR.",
    ],
    query: `mutation($workspaceId: ID!, $defaultCurrency: String!) {
  moneyWorkspaceCurrency(
    workspaceId: $workspaceId
    defaultCurrency: $defaultCurrency
  ) {
    workspaceId
    defaultCurrency
  }
}`,
    variables: {
      workspaceId: "00000000-0000-0000-0000-000000000010",
      defaultCurrency: "USD",
    },
  },
  {
    id: "mutation-moneyWorkspaceClone",
    field: "moneyWorkspaceClone",
    tabLabel: "Clone workspace",
    operationKind: "mutation",
    summary: "Clone the current Money workspace into another workspace target.",
    purpose:
      "Copy the current workspace's Money data into a different target workspace.",
    whenToUse:
      "Use this for setup templates, staging copies, or safe experimentation in a separate workspace.",
    returns: "{ ok: true } on success.",
    inputNotes: [
      "Requires a browser session and write scope.",
      "The current workspace comes from auth context; targetWorkspaceId is the destination.",
    ],
    badges: [{ label: "Session only", tone: "muted" }],
    query: `mutation($targetWorkspaceId: ID!) {
  moneyWorkspaceClone(targetWorkspaceId: $targetWorkspaceId) {
    ok
  }
}`,
    variables: {
      targetWorkspaceId: "00000000-0000-0000-0000-000000000011",
    },
  },
  {
    id: "mutation-moneyWorkspaceReset",
    field: "moneyWorkspaceReset",
    tabLabel: "Reset workspace",
    operationKind: "mutation",
    summary: "Delete or reset Money data for the current workspace.",
    purpose:
      "Clear the current workspace back to an empty Money state.",
    whenToUse:
      "Use this only for destructive maintenance, onboarding resets, or test workspaces.",
    returns: "{ ok: true } on success.",
    inputNotes: [
      "Requires a browser session and write scope.",
      "This is destructive for the current Money workspace.",
    ],
    usageNotes: [
      "Avoid using this in automation unless you are intentionally wiping a workspace.",
    ],
    badges: [{ label: "Session only", tone: "destructive" }],
    query: `mutation {
  moneyWorkspaceReset {
    ok
  }
}`,
  },
  {
    id: "mutation-moneyAccountCreate",
    field: "moneyAccountCreate",
    tabLabel: "Account create",
    operationKind: "mutation",
    summary: "Create a new account in the active workspace.",
    purpose:
      "Add a trackable account such as checking, savings, credit, or cash.",
    whenToUse:
      "Use this before importing transactions or when onboarding a new financial account.",
    returns: "The created account record as JSON.",
    inputNotes: [
      "name is required.",
      "type can be checking, savings, cash, credit, loan, investment, or other.",
    ],
    query: `mutation($input: MoneyAccountCreateInput!) {
  moneyAccountCreate(input: $input)
}`,
    variables: {
      input: {
        name: "Savings",
        type: "savings",
      },
    },
  },
  {
    id: "mutation-moneyAccountUpdate",
    field: "moneyAccountUpdate",
    tabLabel: "Account update",
    operationKind: "mutation",
    summary: "Update an existing account.",
    purpose:
      "Change account metadata such as name, type, balance, institution, or archive state.",
    whenToUse:
      "Use this after an account already exists and you need to edit its details.",
    returns: "The updated account record as JSON.",
    inputNotes: [
      "id must be an existing account UUID in the current workspace.",
    ],
    query: `mutation($id: ID!, $input: MoneyAccountUpdateInput!) {
  moneyAccountUpdate(id: $id, input: $input)
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000101",
      input: {
        institution: "Local Bank",
      },
    },
  },
  {
    id: "mutation-moneyAccountArchive",
    field: "moneyAccountArchive",
    tabLabel: "Account archive",
    operationKind: "mutation",
    summary: "Archive an account so it no longer appears as active.",
    purpose:
      "Hide unused accounts without fully deleting related history.",
    whenToUse:
      "Use this for closed or deprecated accounts you want to keep for reporting.",
    returns: "{ ok: true } when the archive succeeds.",
    inputNotes: [
      "id must be an existing account UUID in the current workspace.",
    ],
    query: `mutation($id: ID!) {
  moneyAccountArchive(id: $id) {
    ok
  }
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000101",
    },
  },
  {
    id: "mutation-moneyCategoryCreate",
    field: "moneyCategoryCreate",
    tabLabel: "Category create",
    operationKind: "mutation",
    summary: "Create a category for income or expense classification.",
    purpose:
      "Add a category so transactions and rules can classify money movement.",
    whenToUse:
      "Use this during workspace setup or when adding a new spending or income bucket.",
    returns: "The created category record as JSON.",
    inputNotes: [
      "name and kind are required.",
      "kind must be expense or income.",
    ],
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
  {
    id: "mutation-moneyCategoryUpdate",
    field: "moneyCategoryUpdate",
    tabLabel: "Category update",
    operationKind: "mutation",
    summary: "Update an existing category.",
    purpose:
      "Rename or reorganize a category after it has already been created.",
    whenToUse:
      "Use this when changing display names or moving categories within the tree.",
    returns: "The updated category record as JSON.",
    inputNotes: [
      "id must be an existing category UUID in the current workspace.",
    ],
    query: `mutation($id: ID!, $input: MoneyCategoryUpdateInput!) {
  moneyCategoryUpdate(id: $id, input: $input)
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000201",
      input: {
        name: "Dining out",
      },
    },
  },
  {
    id: "mutation-moneyCategoryArchive",
    field: "moneyCategoryArchive",
    tabLabel: "Category archive",
    operationKind: "mutation",
    summary: "Archive a category while keeping old transaction history.",
    purpose:
      "Retire a category from future use without deleting historical references.",
    whenToUse:
      "Use this when a category is no longer active but you still want prior reports intact.",
    returns: "{ ok: true } when the archive succeeds.",
    query: `mutation($id: ID!) {
  moneyCategoryArchive(id: $id) {
    ok
  }
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000201",
    },
  },
  {
    id: "mutation-moneyMerchantCreate",
    field: "moneyMerchantCreate",
    tabLabel: "Merchant create",
    operationKind: "mutation",
    summary: "Create a merchant entry.",
    purpose:
      "Add a merchant that transactions and rules can reference.",
    whenToUse:
      "Use this when normalizing imported merchant names or preparing rule inputs.",
    returns: "The created merchant record as JSON.",
    query: `mutation($input: MoneyMerchantCreateInput!) {
  moneyMerchantCreate(input: $input)
}`,
    variables: {
      input: {
        name: "Whole Foods",
      },
    },
  },
  {
    id: "mutation-moneyMerchantUpdate",
    field: "moneyMerchantUpdate",
    tabLabel: "Merchant update",
    operationKind: "mutation",
    summary: "Update a merchant entry.",
    purpose:
      "Rename or normalize an existing merchant.",
    whenToUse:
      "Use this when cleaning up import results or improving merchant matching.",
    returns: "The updated merchant record as JSON.",
    query: `mutation($id: ID!, $input: MoneyMerchantUpdateInput!) {
  moneyMerchantUpdate(id: $id, input: $input)
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000301",
      input: {
        normalizedName: "whole foods",
      },
    },
  },
  {
    id: "mutation-moneyMerchantDelete",
    field: "moneyMerchantDelete",
    tabLabel: "Merchant delete",
    operationKind: "mutation",
    summary: "Delete a merchant entry.",
    purpose:
      "Remove an unused merchant record from the workspace.",
    whenToUse:
      "Use this when a merchant was created by mistake and is safe to remove.",
    returns: "{ ok: true } when deletion succeeds.",
    query: `mutation($id: ID!) {
  moneyMerchantDelete(id: $id) {
    ok
  }
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000301",
    },
  },
  {
    id: "mutation-moneyTagCreate",
    field: "moneyTagCreate",
    tabLabel: "Tag create",
    operationKind: "mutation",
    summary: "Create a tag for ad hoc labeling.",
    purpose:
      "Add a reusable tag for filtering, grouping, or rule actions.",
    whenToUse:
      "Use this when categories are not enough and you need an extra labeling dimension.",
    returns: "The created tag record as JSON.",
    query: `mutation($input: MoneyTagCreateInput!) {
  moneyTagCreate(input: $input)
}`,
    variables: {
      input: {
        name: "Travel",
        color: "#356089",
      },
    },
  },
  {
    id: "mutation-moneyTagUpdate",
    field: "moneyTagUpdate",
    tabLabel: "Tag update",
    operationKind: "mutation",
    summary: "Update an existing tag.",
    purpose:
      "Rename or recolor a tag after it has been created.",
    whenToUse:
      "Use this when refining your tagging taxonomy.",
    returns: "The updated tag record as JSON.",
    query: `mutation($id: ID!, $input: MoneyTagUpdateInput!) {
  moneyTagUpdate(id: $id, input: $input)
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000401",
      input: {
        color: "#40a02b",
      },
    },
  },
  {
    id: "mutation-moneyTagDelete",
    field: "moneyTagDelete",
    tabLabel: "Tag delete",
    operationKind: "mutation",
    summary: "Delete an existing tag.",
    purpose:
      "Remove a tag that is no longer needed.",
    whenToUse:
      "Use this when cleaning up unused tags in a workspace.",
    returns: "{ ok: true } when deletion succeeds.",
    query: `mutation($id: ID!) {
  moneyTagDelete(id: $id) {
    ok
  }
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000401",
    },
  },
  {
    id: "mutation-moneyBudgetCreate",
    field: "moneyBudgetCreate",
    tabLabel: "Budget create",
    operationKind: "mutation",
    summary: "Create a budget for a workspace, category, account, or tag.",
    purpose:
      "Set a spending limit so reporting can compare planned vs actual spend.",
    whenToUse:
      "Use this when configuring monthly budgets or scoped budget limits.",
    returns: "The created budget record as JSON.",
    inputNotes: [
      "scopeType can be workspace, category, account, or tag.",
      "limitAmountMinor uses minor currency units (for USD, 5000 means $50.00).",
    ],
    query: `mutation($input: MoneyBudgetCreateInput!) {
  moneyBudgetCreate(input: $input)
}`,
    variables: {
      input: {
        scopeType: "workspace",
        limitAmountMinor: 50000,
      },
    },
  },
  {
    id: "mutation-moneyBudgetUpdate",
    field: "moneyBudgetUpdate",
    tabLabel: "Budget update",
    operationKind: "mutation",
    summary: "Update a budget limit or scope.",
    purpose:
      "Adjust a budget as spending plans change.",
    whenToUse:
      "Use this when revising a budget limit or target scope.",
    returns: "The updated budget record as JSON.",
    query: `mutation($id: ID!, $input: MoneyBudgetUpdateInput!) {
  moneyBudgetUpdate(id: $id, input: $input)
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000501",
      input: {
        limitAmountMinor: 60000,
      },
    },
  },
  {
    id: "mutation-moneyBudgetDelete",
    field: "moneyBudgetDelete",
    tabLabel: "Budget delete",
    operationKind: "mutation",
    summary: "Delete a budget entry.",
    purpose:
      "Remove a budget definition that is no longer needed.",
    whenToUse:
      "Use this when simplifying budgeting rules or removing obsolete limits.",
    returns: "{ ok: true } when deletion succeeds.",
    query: `mutation($id: ID!) {
  moneyBudgetDelete(id: $id) {
    ok
  }
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000501",
    },
  },
  {
    id: "mutation-moneyRuleCreate",
    field: "moneyRuleCreate",
    tabLabel: "Rule create",
    operationKind: "mutation",
    summary: "Create an automation rule for categorization or tagging.",
    purpose:
      "Define automatic matching logic so imported or created transactions can be enriched consistently.",
    whenToUse:
      "Use this when you want merchants or accounts to auto-assign categories or tags.",
    returns: "The created rule record as JSON.",
    inputNotes: [
      "match must include at least accountId or merchantId.",
      "action can set a category and/or tag ids.",
    ],
    query: `mutation($input: MoneyRuleCreateInput!) {
  moneyRuleCreate(input: $input)
}`,
    variables: {
      input: {
        name: "Groceries rule",
        kind: "expense",
        match: {
          merchantId: "00000000-0000-0000-0000-000000000301",
        },
        action: {
          setCategoryId: "00000000-0000-0000-0000-000000000201",
        },
      },
    },
  },
  {
    id: "mutation-moneyRuleUpdate",
    field: "moneyRuleUpdate",
    tabLabel: "Rule update",
    operationKind: "mutation",
    summary: "Update an existing automation rule.",
    purpose:
      "Refine a matching rule as your data or taxonomy evolves.",
    whenToUse:
      "Use this when rule priority, match criteria, or actions need to change.",
    returns: "The updated rule record as JSON.",
    query: `mutation($id: ID!, $input: MoneyRuleUpdateInput!) {
  moneyRuleUpdate(id: $id, input: $input)
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000601",
      input: {
        active: false,
      },
    },
  },
  {
    id: "mutation-moneyRuleDelete",
    field: "moneyRuleDelete",
    tabLabel: "Rule delete",
    operationKind: "mutation",
    summary: "Delete an automation rule.",
    purpose:
      "Remove a rule that is no longer valid or useful.",
    whenToUse:
      "Use this when cleaning up or replacing automatic matching behavior.",
    returns: "{ ok: true } when deletion succeeds.",
    query: `mutation($id: ID!) {
  moneyRuleDelete(id: $id) {
    ok
  }
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000601",
    },
  },
  {
    id: "mutation-moneyRecurrenceCreate",
    field: "moneyRecurrenceCreate",
    tabLabel: "Recurrence template create",
    operationKind: "mutation",
    summary:
      "Create a recurrence template only (no transaction is posted immediately).",
    purpose:
      "Define a scheduled template that future cron or moneyRecurrenceGenerate runs can materialize.",
    whenToUse:
      "Use this when you want a schedule without posting the first entry yet, or when importing templates in bulk.",
    returns: "The created recurrence template as JSON.",
    inputNotes: [
      "nextRunAt must be an ISO datetime with timezone offset.",
      "template.accountId, template.kind, and template.amountMinor are required.",
      "cadence accepts daily, weekly, biweekly, monthly, quarterly, or yearly (every_5_minutes in development only).",
      "template.categoryId, template.merchantId, template.notes, and template.tagIds are optional.",
    ],
    usageNotes: [
      "To post the first transaction and create the schedule in one call, use moneyTransactionCreate with a recurrence object instead.",
    ],
    query: `mutation($input: MoneyRecurrenceCreateInput!) {
  moneyRecurrenceCreate(input: $input)
}`,
    variables: {
      input: {
        name: "Monthly rent",
        cadence: "monthly",
        nextRunAt: "2025-03-01T00:00:00.000Z",
        template: {
          accountId: "00000000-0000-0000-0000-000000000101",
          kind: "expense",
          amountMinor: 120000,
          categoryId: "00000000-0000-0000-0000-000000000201",
          notes: "Apartment rent",
        },
      },
    },
  },
  {
    id: "mutation-moneyRecurrenceUpdate",
    field: "moneyRecurrenceUpdate",
    tabLabel: "Recurrence update",
    operationKind: "mutation",
    summary: "Update a recurring transaction template.",
    purpose:
      "Adjust cadence, next run date, or template details for an existing recurrence.",
    whenToUse:
      "Use this when a subscription amount changes or a schedule shifts.",
    returns: "The updated recurrence template as JSON.",
    query: `mutation($id: ID!, $input: MoneyRecurrenceUpdateInput!) {
  moneyRecurrenceUpdate(id: $id, input: $input)
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000701",
      input: {
        active: false,
      },
    },
  },
  {
    id: "mutation-moneyRecurrenceDelete",
    field: "moneyRecurrenceDelete",
    tabLabel: "Recurrence delete",
    operationKind: "mutation",
    summary: "Delete a recurrence template.",
    purpose:
      "Remove a recurring schedule that is no longer needed.",
    whenToUse:
      "Use this when a repeating payment has ended or a template was created in error.",
    returns: "{ ok: true } when deletion succeeds.",
    query: `mutation($id: ID!) {
  moneyRecurrenceDelete(id: $id) {
    ok
  }
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000701",
    },
  },
  {
    id: "mutation-moneyRecurrenceGenerate",
    field: "moneyRecurrenceGenerate",
    tabLabel: "Recurrence generate",
    operationKind: "mutation",
    summary: "Generate the next occurrence from a recurrence template.",
    purpose:
      "Create a transaction immediately from a saved recurrence template.",
    whenToUse:
      "Use this in scheduler flows or manual catch-up workflows.",
    returns: "The generated transaction and the nextRunAt timestamp.",
    query: `mutation($id: ID!) {
  moneyRecurrenceGenerate(id: $id) {
    transaction
    nextRunAt
  }
}`,
    variables: {
      id: "00000000-0000-0000-0000-000000000701",
    },
  },
  {
    id: "mutation-moneyTransactionCreate-expense",
    field: "moneyTransactionCreate",
    tabLabel: "Transaction create (expense)",
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
        notes: "Coffee",
      },
    },
  },
  {
    id: "mutation-moneyTransactionCreate-income",
    field: "moneyTransactionCreate",
    tabLabel: "Transaction create (income)",
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
        notes: "Paycheck",
      },
    },
  },
  {
    id: "mutation-moneyTransactionCreate-transfer",
    field: "moneyTransactionCreate",
    tabLabel: "Transaction create (transfer)",
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
      "occurredAt should be an ISO datetime with timezone offset when provided.",
      "Transfers do not use categoryId or merchantId; recurrence is not supported.",
    ],
    usageNotes: [
      "Call moneyAccounts first to obtain valid accountId and toAccountId values.",
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
    tabLabel: "Transaction create (recurring)",
    operationKind: "mutation",
    summary:
      "Create a transaction and attach a recurrence schedule in one request.",
    purpose:
      "Post the first entry immediately and save a template for future scheduled runs.",
    whenToUse:
      "Use this for rent, salary, subscriptions, or other repeating expenses and income — the same flow as Add recurring transaction in the web app.",
    returns:
      "The created transaction as JSON, linked to a new recurrence template via recurrenceSourceId.",
    inputNotes: [
      "accountId and amountMinor are required.",
      "recurrence.cadence is required when recurrence is set; use daily, monthly, or yearly (every_5_minutes in development only).",
      "recurrence.name is optional; when omitted, notes or a default label is used.",
      "occurredAt should be an ISO datetime with timezone offset; it becomes the first posted entry and the anchor for the next run.",
      "categoryId, merchantId, tagIds, and tagNames are optional on the transaction.",
      "Recurrence is not supported on transfers.",
    ],
    usageNotes: [
      "Call moneyAccounts (and moneyCategories if needed) first to obtain valid ids.",
      "Use moneyRecurrenceCreate instead when you only need a template without posting the first transaction.",
      "Future entries are generated by the scheduled job (POST /api/cron/money-recurrence) or moneyRecurrenceGenerate.",
    ],
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
];

export const apiHelpRestApiExamples: ApiHelpRestExample[] = [
  {
    id: "rest-workspace-list",
    tabLabel: "Workspace list",
    method: "GET",
    path: "/api/workspace/list?app=money",
    auth: "Session only",
    summary: "List workspaces the signed-in user can access for the Money app.",
    purpose:
      "Fetch available Money workspaces and identify the default one for the current user.",
    whenToUse:
      "Use this in browser-based setup flows or workspace pickers that rely on the user's session.",
    returns: "JSON data array of workspaces, with isDefault for the current app.",
    inputNotes: [
      "This route currently requires a browser session.",
      "Pass app=money in the query string.",
    ],
    codeSample: {
      id: "rest-workspace-list-sample",
      label: "Browser session example",
      language: "javascript",
      body: buildSessionFetchExample("/api/workspace/list?app=money"),
    },
  },
  {
    id: "rest-import-preview",
    tabLabel: "Import preview",
    method: "POST",
    path: "/api/money/import/preview",
    auth: "Bearer + write",
    summary: "Upload a CSV file and get a preview with previewId, rows, warnings, and errors.",
    purpose:
      "Validate and inspect import rows before committing them.",
    whenToUse:
      "Use this first in any CSV import workflow.",
    returns: "JSON preview payload with previewId, parsed rows, and validation feedback.",
    inputNotes: [
      "Request must be multipart/form-data.",
      "Send type and file; columnMap is optional JSON.",
    ],
    usageNotes: [
      "Use the returned previewId with commit or abandon.",
    ],
    codeSample: {
      id: "rest-import-preview-sample",
      label: "Bearer token example",
      language: "bash",
      body: `curl -sS "${API_HELP_BASE_URL_PLACEHOLDER}/api/money/import/preview" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -F "type=accounts" \\
  -F "file=@accounts.csv"`,
    },
  },
  {
    id: "rest-import-commit",
    tabLabel: "Import commit",
    method: "POST",
    path: "/api/money/import/commit",
    auth: "Bearer + write",
    summary: "Commit a previously previewed import or send validated rows directly.",
    purpose:
      "Persist imported data after preview validation is complete.",
    whenToUse:
      "Use this right after a successful preview when you are ready to create records.",
    returns: "JSON { data: { imported } } with the number of imported rows.",
    inputNotes: [
      "Send either previewId or rows, not both.",
      "type must match one of the supported import types.",
    ],
    codeSample: {
      id: "rest-import-commit-sample",
      label: "Commit by previewId",
      language: "bash",
      body: `curl -sS "${API_HELP_BASE_URL_PLACEHOLDER}/api/money/import/commit" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"type":"accounts","previewId":"00000000-0000-0000-0000-000000000901"}'`,
    },
  },
  {
    id: "rest-import-abandon",
    tabLabel: "Import abandon",
    method: "POST",
    path: "/api/money/import/abandon",
    auth: "Bearer + write",
    summary: "Discard a stored import preview without committing it.",
    purpose:
      "Clean up preview state after a user cancels an import.",
    whenToUse:
      "Use this when a preview should be explicitly discarded.",
    returns: "HTTP 204 with no response body.",
    inputNotes: [
      "Send previewId in JSON.",
    ],
    codeSample: {
      id: "rest-import-abandon-sample",
      label: "Discard preview",
      language: "bash",
      body: `curl -sS -X POST "${API_HELP_BASE_URL_PLACEHOLDER}/api/money/import/abandon" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"previewId":"00000000-0000-0000-0000-000000000901"}'`,
    },
  },
  {
    id: "rest-import-direct",
    tabLabel: "Direct import",
    method: "POST",
    path: "/api/money/import/{kind}",
    auth: "Bearer + write",
    summary: "Create records directly from a JSON rows array without using preview state.",
    purpose:
      "Import rows programmatically when you already have validated JSON data.",
    whenToUse:
      "Use this for automation or trusted pipelines that do not need the preview workflow.",
    returns: "JSON { data: { created } } with the number of created records.",
    inputNotes: [
      "Replace {kind} with accounts, categories, budgets, transactions, rules, or recurrence.",
      "Send { rows: unknown[] } in the request body.",
    ],
    codeSample: {
      id: "rest-import-direct-sample",
      label: "Direct accounts import",
      language: "bash",
      body: `curl -sS -X POST "${API_HELP_BASE_URL_PLACEHOLDER}/api/money/import/accounts" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"rows":[{"name":"Checking","type":"checking"}]}'`,
    },
  },
  {
    id: "rest-import-direct-recurrence",
    tabLabel: "Direct recurrence import",
    method: "POST",
    path: "/api/money/import/recurrence",
    auth: "Bearer + write",
    summary:
      "Create recurrence templates from a JSON rows array (template-only; no first transaction is posted).",
    purpose:
      "Bulk-import recurring schedules when you already have validated JSON data.",
    whenToUse:
      "Use this for migrations or automation that need many templates without the preview workflow.",
    returns: "JSON { data: { created } } with the number of created templates.",
    inputNotes: [
      "Each row needs name, cadence, nextRunAt, and template fields (accountId, kind, amountMinor).",
      "Same shape as moneyRecurrenceCreate input; see the Recurrence template create mutation tab for field details.",
      "To post the first transaction and schedule together, use the Transaction create (recurring) GraphQL mutation instead.",
    ],
    codeSample: {
      id: "rest-import-direct-recurrence-sample",
      label: "Direct recurrence import",
      language: "bash",
      body: `curl -sS -X POST "${API_HELP_BASE_URL_PLACEHOLDER}/api/money/import/recurrence" \\
  -H "Authorization: Bearer mny_YOUR_TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{"rows":[{"name":"Monthly rent","cadence":"monthly","nextRunAt":"2025-03-01T00:00:00.000Z","template":{"accountId":"00000000-0000-0000-0000-000000000101","kind":"expense","amountMinor":120000,"notes":"Apartment rent"}}]}'`,
    },
  },
  {
    id: "rest-tokens-list",
    tabLabel: "Tokens list",
    method: "GET",
    path: "/api/tokens",
    auth: "Session only",
    summary: "List API tokens owned by the signed-in user.",
    purpose:
      "Show token metadata such as key prefix, scopes, workspace, and last-used timestamps.",
    whenToUse:
      "Use this in account settings or internal admin views tied to the user's browser session.",
    returns: "JSON { data: ApiTokenListItem[] }.",
    inputNotes: [
      "Requires a browser session; Bearer auth is not accepted.",
    ],
    codeSample: {
      id: "rest-tokens-list-sample",
      label: "Browser session example",
      language: "javascript",
      body: buildSessionFetchExample("/api/tokens"),
    },
  },
  {
    id: "rest-tokens-create",
    tabLabel: "Tokens create",
    method: "POST",
    path: "/api/tokens",
    auth: "Session only",
    summary: "Create a new API token and reveal the secret once.",
    purpose:
      "Issue a personal API token bound to a single Money workspace.",
    whenToUse:
      "Use this when preparing automation, scripts, or Postman collections.",
    returns: "JSON with the one-time token secret and token metadata.",
    inputNotes: [
      "name and workspaceId are required.",
      "scopes must include read; expiresAt is optional ISO datetime.",
    ],
    usageNotes: [
      "Store the returned token securely. You cannot read the secret again later.",
    ],
    codeSample: {
      id: "rest-tokens-create-sample",
      label: "Browser session example",
      language: "javascript",
      body: buildSessionFetchExample("/api/tokens", {
        method: "POST",
        body: {
          name: "nightly backup",
          workspaceId: "00000000-0000-0000-0000-000000000010",
          scopes: ["read", "write"],
        },
      }),
    },
  },
  {
    id: "rest-tokens-revoke",
    tabLabel: "Tokens revoke",
    method: "DELETE",
    path: "/api/tokens/{id}",
    auth: "Session only",
    summary: "Revoke an API token so it can no longer be used.",
    purpose:
      "Immediately disable a token that is expired, compromised, or no longer needed.",
    whenToUse:
      "Use this when rotating credentials or responding to a suspected leak.",
    returns: "HTTP 204 with no response body.",
    inputNotes: [
      "Replace {id} with the token row id, not the secret string.",
    ],
    codeSample: {
      id: "rest-tokens-revoke-sample",
      label: "Browser session example",
      language: "javascript",
      body: `const tokenId = "00000000-0000-0000-0000-000000000902";
const res = await fetch(
  "${API_HELP_BASE_URL_PLACEHOLDER}/api/tokens/" + tokenId,
  {
    method: "DELETE",
    credentials: "include",
  },
);
console.log(res.status);`,
    },
  },
];

export const apiHelpSteps: ApiHelpStep[] = [
  { step: 1, label: "Overview", sectionId: "overview" },
  { step: 2, label: "Create an API token", sectionId: "token" },
  { step: 3, label: "Authenticate requests", sectionId: "auth" },
  { step: 4, label: "GraphQL queries", sectionId: "graphql-query" },
  { step: 5, label: "GraphQL mutations", sectionId: "graphql-mutate" },
  { step: 6, label: "GraphQL schema & Postman", sectionId: "graphql-schema" },
  { step: 7, label: "REST import", sectionId: "rest-import" },
  { step: 8, label: "Errors", sectionId: "errors" },
  { step: 9, label: "Security", sectionId: "security" },
];

export const apiHelpSections: ApiHelpSection[] = [
  {
    id: "overview",
    title: "Overview",
    description:
      "The app exposes GraphQL as the primary API for Money data, plus REST endpoints for CSV import and token management. The web UI uses session cookies; scripts and Postman use personal Bearer tokens.",
    bullets: [
      "GraphQL endpoint: POST /api/graphql (GET supported for GraphQL Yoga)",
      "REST: CSV import preview/commit and direct row import",
      "Base URL: your app origin (e.g. http://localhost:3000 in development)",
    ],
  },
  {
    id: "token",
    title: "Create an API token",
    description:
      "Sign in to the app, then create a token bound to one Money workspace. Copy the secret once — it starts with mny_. Token routes (/api/tokens) require a browser session; you cannot create or revoke tokens with Bearer auth.",
    bullets: [
      "Open Settings → API tokens and choose a workspace",
      "Enable write scope if you need mutations or CSV import",
      "Revoke compromised tokens immediately in Settings",
    ],
  },
  {
    id: "auth",
    title: "Authenticate requests",
    description:
      "Send your token on every GraphQL and REST request. Each token is tied to a single workspace at creation — you do not need the ctx_workspace_money cookie when using Bearer auth.",
    codeSamples: [
      {
        id: "auth-header",
        label: "Authorization header",
        language: "http",
        body: "Authorization: Bearer mny_YOUR_TOKEN",
      },
    ],
    scopeTable: [
      { scope: "read", allows: "GraphQL queries, read-only REST" },
      {
        scope: "write",
        allows: "GraphQL mutations, CSV import REST (403 without write)",
      },
    ],
  },
  {
    id: "graphql-query",
    title: "GraphQL queries",
    description:
      "Browse query tabs, read what each one is for, then copy the example usage.",
    graphqlQueries: apiHelpGraphqlQueryExamples,
    bullets: [
      "Export the full schema: npm run api:export-schema → docs/money.graphql",
      "JSONObject fields return opaque JSON blobs; shape matches the web app payloads",
    ],
  },
  {
    id: "graphql-mutate",
    title: "GraphQL mutations",
    description:
      "Browse mutation tabs to see which mutations work with API tokens, which are session-only, and what example payload each one expects.",
    graphqlMutations: apiHelpGraphqlMutationExamples,
    bullets: [
      "Recurring transactions: use Transaction create (recurring) to post the first entry and schedule future runs; use Recurrence template create for template-only imports",
      "Some workspace-admin mutations (clone, reset) require a browser session only — API tokens are blocked",
      "All mutations require write scope; tokens without write receive 403",
    ],
  },
  {
    id: "graphql-schema",
    title: "GraphQL schema & Postman",
    description:
      "Export the schema from your clone of the repo, then import it into Postman or another GraphQL client.",
    codeSamples: [
      {
        id: "export-schema",
        label: "Export schema (from repo root)",
        language: "bash",
        body: "npm run api:export-schema\n# → docs/money.graphql",
      },
    ],
    bullets: [
      "Postman: New → GraphQL, import docs/money.graphql, set Authorization → Bearer Token",
      "OpenAPI for REST import routes: docs/openapi.yaml (Import → OpenAPI in Postman)",
    ],
  },
  {
    id: "rest-import",
    title: "REST APIs",
    description:
      "Use the REST API tabs for session-only account endpoints and Bearer-auth import workflows.",
    restApis: apiHelpRestApiExamples,
    bullets: [
      "Import kinds: accounts, categories, merchants, tags, budgets, transactions, rules, recurrence",
    ],
  },
  {
    id: "errors",
    title: "Errors",
    description: "REST and GraphQL use different error shapes. Check the code or extensions.code field for programmatic handling.",
    codeSamples: [
      {
        id: "rest-error",
        label: "REST error envelope",
        language: "json",
        body: '{ "error": "Human message", "code": "unauthorized" }',
      },
    ],
    bullets: [
      "REST codes: unauthorized, forbidden, bad_request, not_found, db_unavailable",
      "GraphQL: errors[].message with extensions.code (e.g. UNAUTHORIZED, FORBIDDEN)",
    ],
  },
  {
    id: "security",
    title: "Security",
    description: "Treat API tokens like passwords. Never commit them or embed them in client-side code.",
    bullets: [
      "Use HTTPS in production",
      "Revoke compromised tokens in Settings immediately",
      "Prefer read-only tokens when automation only exports data",
      "Create tokens under Settings; manage usage from this tutorial",
    ],
  },
];

export function resolveApiHelpSampleBody(
  body: string,
  baseUrl: string,
): string {
  return body.replaceAll(API_HELP_BASE_URL_PLACEHOLDER, baseUrl);
}
