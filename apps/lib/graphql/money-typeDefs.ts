export const moneyTypeDefs = /* GraphQL */ `
  scalar JSONObject

  input AnalyticsFiltersInput {
    from: String
    to: String
    accountIds: [String!]
    categoryIds: [String!]
    merchantIds: [String!]
    tagIds: [String!]
    kinds: [String!]
  }

  type MoneyBootstrapWorkspace {
    id: ID!
    name: String!
    kind: String!
    ownedByUserSub: String
    defaultCurrency: String
    role: String!
    isDefault: Boolean!
  }

  type MoneyBootstrapPayload {
    workspaceId: ID!
    defaultCurrency: String
    needsCurrencySetup: Boolean!
    defaultWorkspaceId: ID
    workspaces: [MoneyBootstrapWorkspace!]!
    accounts: [JSONObject!]!
    categories: [JSONObject!]!
    merchants: [JSONObject!]!
    tags: [JSONObject!]!
  }

  type MoneyWorkspaceStatePayload {
    workspaceId: ID!
    defaultCurrency: String
    needsCurrencySetup: Boolean!
    defaultWorkspaceId: ID
    workspaces: [MoneyBootstrapWorkspace!]!
  }

  type MoneyTransactionConnection {
    data: [JSONObject!]!
    total: Int!
    page: Int!
    pageSize: Int!
  }

  type MoneyCurrencyPatch {
    workspaceId: ID!
    defaultCurrency: String
  }

  type MoneyWorkspaceCloneResult {
    ok: Boolean!
  }

  type MoneyWorkspaceResetResult {
    ok: Boolean!
  }

  type MoneyOk {
    ok: Boolean!
  }

  type MoneyRecurrenceGenerateResult {
    transaction: JSONObject!
    nextRunAt: String!
  }

  type Query {
    moneyBootstrap: MoneyBootstrapPayload!
    moneyWorkspaceState: MoneyWorkspaceStatePayload!
    moneyAnalytics(filters: AnalyticsFiltersInput!): JSONObject!
    moneyAnalyticsOverview(filters: AnalyticsFiltersInput!): JSONObject!
    moneyAnalyticsBreakdown(filters: AnalyticsFiltersInput!): JSONObject!
    moneyBudgets(includeSpent: Boolean!, from: String, to: String): [JSONObject!]!
    moneyTransactions(query: JSONObject!): MoneyTransactionConnection!
    moneyAccounts: [JSONObject!]!
    moneyCategories: [JSONObject!]!
    moneyMerchants: [JSONObject!]!
    moneyTags: [JSONObject!]!
    moneyRules: [JSONObject!]!
    moneyRecurrenceTemplates: [JSONObject!]!
    moneyTransaction(id: ID!): JSONObject
    moneyParseCsv(csv: String!): JSONObject!
  }

  type Mutation {
    moneySetActiveWorkspace(workspaceId: ID!, app: String!): Boolean!
    moneyWorkspaceCurrency(workspaceId: ID!, defaultCurrency: String!): MoneyCurrencyPatch!
    moneyWorkspaceClone(targetWorkspaceId: ID!): MoneyWorkspaceCloneResult!
    moneyWorkspaceReset: MoneyWorkspaceResetResult!

    moneyAccountCreate(input: JSONObject!): JSONObject!
    moneyAccountUpdate(id: ID!, input: JSONObject!): JSONObject!
    moneyAccountArchive(id: ID!): MoneyOk!

    moneyCategoryCreate(input: JSONObject!): JSONObject!
    moneyCategoryUpdate(id: ID!, input: JSONObject!): JSONObject!
    moneyCategoryArchive(id: ID!): MoneyOk!

    moneyMerchantCreate(input: JSONObject!): JSONObject!
    moneyMerchantUpdate(id: ID!, input: JSONObject!): JSONObject!
    moneyMerchantDelete(id: ID!): MoneyOk!

    moneyTagCreate(input: JSONObject!): JSONObject!
    moneyTagUpdate(id: ID!, input: JSONObject!): JSONObject!
    moneyTagDelete(id: ID!): MoneyOk!

    moneyBudgetCreate(input: JSONObject!): JSONObject!
    moneyBudgetUpdate(id: ID!, input: JSONObject!): JSONObject!
    moneyBudgetDelete(id: ID!): MoneyOk!

    moneyRuleCreate(input: JSONObject!): JSONObject!
    moneyRuleUpdate(id: ID!, input: JSONObject!): JSONObject!
    moneyRuleDelete(id: ID!): MoneyOk!

    moneyRecurrenceCreate(input: JSONObject!): JSONObject!
    moneyRecurrenceUpdate(id: ID!, input: JSONObject!): JSONObject!
    moneyRecurrenceDelete(id: ID!): MoneyOk!
    moneyRecurrenceGenerate(id: ID!): MoneyRecurrenceGenerateResult!

    moneyTransactionCreate(input: JSONObject!): JSONObject!
    moneyTransactionUpdate(id: ID!, input: JSONObject!): JSONObject!
    moneyTransactionDelete(id: ID!): MoneyOk!
  }
`;
