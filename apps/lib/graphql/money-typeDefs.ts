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

  input MoneyAccountCreateInput {
    name: String!
    type: String
    institution: String
    balanceMinor: Int
    sortOrder: Int
    archived: Boolean
  }

  input MoneyAccountUpdateInput {
    name: String
    type: String
    institution: String
    balanceMinor: Int
    sortOrder: Int
    archived: Boolean
  }

  input MoneyCategoryCreateInput {
    name: String!
    kind: String!
    parentId: ID
    archived: Boolean
  }

  input MoneyCategoryUpdateInput {
    name: String
    parentId: ID
    archived: Boolean
  }

  input MoneyMerchantCreateInput {
    name: String!
    normalizedName: String
  }

  input MoneyMerchantUpdateInput {
    name: String
    normalizedName: String
  }

  input MoneyTagCreateInput {
    name: String!
    color: String
  }

  input MoneyTagUpdateInput {
    name: String
    color: String
  }

  input MoneyBudgetCreateInput {
    scopeType: String!
    scopeId: ID
    limitAmountMinor: Int!
  }

  input MoneyBudgetUpdateInput {
    scopeType: String
    scopeId: ID
    limitAmountMinor: Int
  }

  input MoneyRuleCreateInput {
    name: String!
    kind: String!
    priority: Int
    match: JSONObject!
    action: JSONObject!
    active: Boolean
  }

  input MoneyRuleUpdateInput {
    name: String
    priority: Int
    match: JSONObject
    action: JSONObject
    active: Boolean
  }

  input MoneyRecurrenceCreateInput {
    name: String!
    cadence: String!
    nextRunAt: String!
    template: JSONObject!
    active: Boolean
  }

  input MoneyRecurrenceUpdateInput {
    name: String
    cadence: String
    nextRunAt: String
    template: JSONObject
    active: Boolean
  }

  input MoneyTransactionRecurrenceInput {
    cadence: String!
    name: String
  }

  input MoneyTransactionCreateInput {
    accountId: ID!
    toAccountId: ID
    kind: String
    amountMinor: Int!
    occurredAt: String
    categoryId: ID
    merchantId: ID
    notes: String
    tagIds: [ID!]
    tagNames: [String!]
    recurrence: MoneyTransactionRecurrenceInput
  }

  input MoneyTransactionUpdateInput {
    accountId: ID
    toAccountId: ID
    kind: String
    amountMinor: Int
    occurredAt: String
    categoryId: ID
    merchantId: ID
    notes: String
    tagIds: [ID!]
  }

  type Query {
    moneyBootstrap: MoneyBootstrapPayload!
    moneyWorkspaceState: MoneyWorkspaceStatePayload!
    moneyAnalyticsSummary(filters: AnalyticsFiltersInput!): JSONObject!
    moneyAnalyticsOverview(filters: AnalyticsFiltersInput!): JSONObject!
    moneyAnalyticsDistribution(filters: AnalyticsFiltersInput!): JSONObject!
    moneyAnalyticsBudgets(filters: AnalyticsFiltersInput!): JSONObject!
    moneyAnalyticsSankey(filters: AnalyticsFiltersInput!): JSONObject!
    moneyAnalyticsLeaders(filters: AnalyticsFiltersInput!): JSONObject!
    moneyBudgets(includeSpent: Boolean!, from: String, to: String): [JSONObject!]!
    moneyCategoryBudgetStatus(from: String!, to: String!): [JSONObject!]!
    moneyTransactions(query: JSONObject!): MoneyTransactionConnection!
    moneyAccounts: [JSONObject!]!
    moneyCategories: [JSONObject!]!
    moneyMerchants: [JSONObject!]!
    moneyTopAmounts: [JSONObject!]!
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

    moneyAccountCreate(input: MoneyAccountCreateInput!): JSONObject!
    moneyAccountUpdate(id: ID!, input: MoneyAccountUpdateInput!): JSONObject!
    moneyAccountArchive(id: ID!): MoneyOk!

    moneyCategoryCreate(input: MoneyCategoryCreateInput!): JSONObject!
    moneyCategoryUpdate(id: ID!, input: MoneyCategoryUpdateInput!): JSONObject!
    moneyCategoryArchive(id: ID!): MoneyOk!

    moneyMerchantCreate(input: MoneyMerchantCreateInput!): JSONObject!
    moneyMerchantUpdate(id: ID!, input: MoneyMerchantUpdateInput!): JSONObject!
    moneyMerchantDelete(id: ID!): MoneyOk!

    moneyTagCreate(input: MoneyTagCreateInput!): JSONObject!
    moneyTagUpdate(id: ID!, input: MoneyTagUpdateInput!): JSONObject!
    moneyTagDelete(id: ID!): MoneyOk!

    moneyBudgetCreate(input: MoneyBudgetCreateInput!): JSONObject!
    moneyBudgetUpdate(id: ID!, input: MoneyBudgetUpdateInput!): JSONObject!
    moneyBudgetDelete(id: ID!): MoneyOk!

    moneyRuleCreate(input: MoneyRuleCreateInput!): JSONObject!
    moneyRuleUpdate(id: ID!, input: MoneyRuleUpdateInput!): JSONObject!
    moneyRuleDelete(id: ID!): MoneyOk!

    moneyRecurrenceCreate(input: MoneyRecurrenceCreateInput!): JSONObject!
    moneyRecurrenceUpdate(id: ID!, input: MoneyRecurrenceUpdateInput!): JSONObject!
    moneyRecurrenceDelete(id: ID!): MoneyOk!
    moneyRecurrenceGenerate(id: ID!): MoneyRecurrenceGenerateResult!

    moneyTransactionCreate(input: MoneyTransactionCreateInput!): JSONObject!
    moneyTransactionUpdate(id: ID!, input: MoneyTransactionUpdateInput!): JSONObject!
    moneyTransactionDelete(id: ID!): MoneyOk!
  }
`;
