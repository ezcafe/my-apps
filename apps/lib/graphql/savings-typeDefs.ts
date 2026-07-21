export const savingsTypeDefs = /* GraphQL */ `
  scalar BigInt

  type SavingsBootstrapWorkspace {
    id: ID!
    name: String!
    kind: String!
    ownedByUserSub: String
    defaultCurrency: String
    role: String!
    isDefault: Boolean!
  }

  type SavingsBootstrapPayload {
    workspaceId: ID!
    defaultCurrency: String
    needsCurrencySetup: Boolean!
    defaultWorkspaceId: ID
    workspaces: [SavingsBootstrapWorkspace!]!
    accountCount: Int!
  }

  type SavingsOk {
    ok: Boolean!
  }

  type SavingsAccount {
    id: ID!
    name: String!
    currency: String!
    sortOrder: Int!
    archived: Boolean!
    balanceMinor: BigInt!
  }

  type SavingsActivityRow {
    id: ID!
    accountId: ID!
    accountName: String!
    accountCurrency: String!
    activityDate: String!
    type: String!
    amountMinor: BigInt!
    notes: String
    moneyAccountId: ID
    moneyTransactionId: ID
  }

  type SavingsActivitiesConnection {
    items: [SavingsActivityRow!]!
    nextCursor: ID
  }

  type SavingsBalancePoint {
    date: String!
    totalMinor: BigInt!
  }

  input SavingsAccountCreateInput {
    name: String!
    currency: String
    sortOrder: Int
  }

  input SavingsAccountUpdateInput {
    name: String
    currency: String
    sortOrder: Int
    archived: Boolean
  }

  input SavingsActivityCreateInput {
    accountId: ID!
    activityDate: String!
    type: String!
    amountMinor: BigInt!
    notes: String
    moneyAccountId: ID
    moneyTransactionId: ID
  }

  input SavingsActivityUpdateInput {
    accountId: ID
    activityDate: String
    type: String
    amountMinor: BigInt
    notes: String
    moneyAccountId: ID
    moneyTransactionId: ID
  }

  input SavingsActivitiesQueryInput {
    accountId: ID
    from: String
    to: String
    limit: Int
    cursor: ID
  }

  type Query {
    savingsBootstrap: SavingsBootstrapPayload!
    savingsAccounts: [SavingsAccount!]!
    savingsActivities(query: SavingsActivitiesQueryInput): SavingsActivitiesConnection!
    savingsActivity(id: ID!): SavingsActivityRow
    savingsBalanceSeries(from: String!, to: String!): [SavingsBalancePoint!]!
  }

  type Mutation {
    savingsAccountCreate(input: SavingsAccountCreateInput!): SavingsAccount!
    savingsAccountUpdate(id: ID!, input: SavingsAccountUpdateInput!): SavingsAccount!
    savingsActivityCreate(input: SavingsActivityCreateInput!): SavingsActivityRow!
    savingsActivityUpdate(id: ID!, input: SavingsActivityUpdateInput!): SavingsActivityRow!
    savingsActivityDelete(id: ID!): SavingsOk!
  }
`;
