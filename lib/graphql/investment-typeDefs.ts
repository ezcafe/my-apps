export const investmentTypeDefs = /* GraphQL */ `
  scalar BigInt

  type InvestmentBootstrapWorkspace {
    id: ID!
    name: String!
    kind: String!
    ownedByUserSub: String
    defaultCurrency: String
    role: String!
    isDefault: Boolean!
  }

  type InvestmentBootstrapPayload {
    workspaceId: ID!
    defaultCurrency: String
    needsCurrencySetup: Boolean!
    defaultWorkspaceId: ID
    workspaces: [InvestmentBootstrapWorkspace!]!
    instrumentCount: Int!
  }

  type InvestmentOk {
    ok: Boolean!
  }

  type InvestmentInstrument {
    id: ID!
    kind: String!
    name: String!
    currency: String!
    symbol: String!
    yahooSymbol: String
    archived: Boolean!
  }

  type InvestmentActivityRow {
    id: ID!
    instrumentId: ID!
    instrumentName: String!
    instrumentKind: String!
    instrumentSymbol: String!
    instrumentCurrency: String!
    activityDate: String!
    type: String!
    quantity: String
    unitPriceMinor: BigInt
    amountMinor: BigInt
    notes: String
    moneyAccountId: ID
    moneyTransactionId: ID
  }

  type InvestmentActivitiesConnection {
    items: [InvestmentActivityRow!]!
    nextCursor: ID
  }

  type InvestmentPortfolioPoint {
    date: String!
    totalMinor: BigInt!
  }

  type InvestmentHoldingRow {
    instrumentId: ID!
    kind: String!
    name: String!
    symbol: String!
    currency: String!
    quantity: Float!
    priceMinor: BigInt!
    valueMinor: BigInt!
    quoteAsOf: String
  }

  input InvestmentInstrumentCreateInput {
    kind: String!
    name: String!
    currency: String
    symbol: String!
    yahooSymbol: String
  }

  input InvestmentInstrumentUpdateInput {
    kind: String
    name: String
    currency: String
    symbol: String
    yahooSymbol: String
    archived: Boolean
  }

  input InvestmentActivityCreateInput {
    instrumentId: ID!
    activityDate: String!
    type: String!
    quantity: String
    unitPriceMinor: BigInt
    amountMinor: BigInt
    notes: String
    moneyAccountId: ID
    moneyTransactionId: ID
  }

  input InvestmentActivityUpdateInput {
    instrumentId: ID
    activityDate: String
    type: String
    quantity: String
    unitPriceMinor: BigInt
    amountMinor: BigInt
    notes: String
    moneyAccountId: ID
    moneyTransactionId: ID
  }

  input InvestmentActivitiesQueryInput {
    instrumentId: ID
    kind: String
    from: String
    to: String
    limit: Int
    cursor: ID
  }

  type Query {
    investmentBootstrap: InvestmentBootstrapPayload!
    investmentInstruments: [InvestmentInstrument!]!
    investmentActivities(query: InvestmentActivitiesQueryInput): InvestmentActivitiesConnection!
    investmentActivity(id: ID!): InvestmentActivityRow
    investmentPortfolioValueSeries(from: String!, to: String!): [InvestmentPortfolioPoint!]!
    investmentHoldingsSnapshot: [InvestmentHoldingRow!]!
  }

  type Mutation {
    investmentInstrumentCreate(input: InvestmentInstrumentCreateInput!): InvestmentInstrument!
    investmentInstrumentUpdate(id: ID!, input: InvestmentInstrumentUpdateInput!): InvestmentInstrument!
    investmentActivityCreate(input: InvestmentActivityCreateInput!): InvestmentActivityRow!
    investmentActivityUpdate(id: ID!, input: InvestmentActivityUpdateInput!): InvestmentActivityRow!
    investmentActivityDelete(id: ID!): InvestmentOk!
    investmentRefreshQuotes: InvestmentOk!
  }
`;
