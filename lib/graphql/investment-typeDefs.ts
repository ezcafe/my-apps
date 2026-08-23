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
    contractSize: String!
    archived: Boolean!
    moneyAccountId: ID
    incomeCategoryId: ID
    expenseCategoryId: ID
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
    openPrice: String
    closePrice: String
    stopLoss: String
    takeProfit: String
    amountMinor: BigInt
    notes: String
    moneyAccountId: ID
    moneyTransactionId: ID
    status: String
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

  type InvestmentFxRate {
    rate: Float!
    sourceSymbol: String!
    inverted: Boolean!
    asOf: String!
  }

  input InvestmentInstrumentCreateInput {
    kind: String!
    name: String
    currency: String
    symbol: String!
    yahooSymbol: String
    contractSize: String
    moneyAccountId: ID!
    incomeCategoryId: ID!
    expenseCategoryId: ID!
  }

  input InvestmentInstrumentUpdateInput {
    kind: String
    name: String
    currency: String
    symbol: String
    yahooSymbol: String
    contractSize: String
    archived: Boolean
    moneyAccountId: ID
    incomeCategoryId: ID
    expenseCategoryId: ID
  }

  input InvestmentActivityCreateInput {
    instrumentId: ID!
    activityDate: String!
    type: String!
    quantity: String
    unitPriceMinor: BigInt
    openPrice: String
    stopLoss: String
    takeProfit: String
    amountMinor: BigInt
    notes: String
    moneyAccountId: ID
    categoryId: ID
    moneyTransactionId: ID
  }

  input InvestmentActivityUpdateInput {
    instrumentId: ID
    activityDate: String
    type: String
    quantity: String
    unitPriceMinor: BigInt
    openPrice: String
    stopLoss: String
    takeProfit: String
    amountMinor: BigInt
    notes: String
    moneyAccountId: ID
    moneyTransactionId: ID
  }

  input InvestmentActivityCloseInput {
    id: ID!
    closePrice: String!
    feeMinor: BigInt
    activityDate: String
    notes: String
    moneyAccountId: ID
    categoryId: ID
    fxRate: Float
  }

  input InvestmentActivityRealizeInput {
    instrumentId: ID!
    activityDate: String!
    quantity: String!
    openPrice: String!
    closePrice: String!
    feeMinor: BigInt
    type: String!
    priceCurrency: String!
    fxRate: Float!
    notes: String
    moneyAccountId: ID
    categoryId: ID
  }

  input InvestmentActivityCashMoveInput {
    instrumentId: ID!
    activityDate: String!
    type: String!
    amountMinor: BigInt!
    feeMinor: BigInt
    notes: String
    moneyAccountId: ID
    categoryId: ID
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
    investmentOpenActivities(instrumentId: ID): [InvestmentActivityRow!]!
    investmentActivity(id: ID!): InvestmentActivityRow
    investmentPortfolioValueSeries(from: String!, to: String!): [InvestmentPortfolioPoint!]!
    investmentHoldingsSnapshot: [InvestmentHoldingRow!]!
    investmentFxRate(from: String!, to: String!): InvestmentFxRate
  }

  type Mutation {
    investmentInstrumentCreate(input: InvestmentInstrumentCreateInput!): InvestmentInstrument!
    investmentInstrumentUpdate(id: ID!, input: InvestmentInstrumentUpdateInput!): InvestmentInstrument!
    investmentActivityCreate(input: InvestmentActivityCreateInput!): InvestmentActivityRow!
    investmentActivityClose(input: InvestmentActivityCloseInput!): InvestmentActivityRow!
    investmentActivityRealize(input: InvestmentActivityRealizeInput!): InvestmentActivityRow!
    investmentActivityCashMove(input: InvestmentActivityCashMoveInput!): InvestmentActivityRow!
    investmentActivityUpdate(id: ID!, input: InvestmentActivityUpdateInput!): InvestmentActivityRow!
    investmentActivityDelete(id: ID!): InvestmentOk!
    investmentRefreshQuotes: InvestmentOk!
  }
`;
