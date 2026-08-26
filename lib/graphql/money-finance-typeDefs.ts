/** Loan + investment GraphQL types merged into the Money schema. */
export const moneyFinanceTypeDefs = /* GraphQL */ `
  scalar BigInt

  type LoansBootstrapWorkspace {
    id: ID!
    name: String!
    kind: String!
    ownedByUserSub: String
    defaultCurrency: String
    role: String!
    isDefault: Boolean!
  }

  type LoansBootstrapPayload {
    workspaceId: ID!
    defaultCurrency: String
    needsCurrencySetup: Boolean!
    defaultWorkspaceId: ID
    workspaces: [LoansBootstrapWorkspace!]!
    dueCount: Int!
  }

  type LoansOk {
    ok: Boolean!
  }

  type LoanCreateResult {
    id: ID!
  }

  type LoanPayWithTransactionResult {
    ok: Boolean!
    moneyTransactionId: ID!
  }

  type LoanSummary {
    totalPaidMinor: BigInt!
    remainingMinor: BigInt!
    percentComplete: Float!
    projectedPayoffDate: String
    monthsAheadBehind: Int!
  }

  type LoanChartPoint {
    label: String!
    scheduledCumulativeMinor: BigInt!
    actualCumulativeMinor: BigInt!
    projectedCumulativeMinor: BigInt!
  }

  type LoanInstallment {
    scheduleInstallmentId: ID!
    installmentNumber: Int!
    dueDate: String!
    paymentMinor: BigInt!
    principalMinor: BigInt!
    interestMinor: BigInt!
    balanceAfterMinor: BigInt!
    status: String!
    paidAt: String
    moneyTransactionId: ID
    paidWithoutTransaction: Boolean!
  }

  type LoanListItem {
    id: ID!
    name: String!
    currency: String!
    principalMinor: BigInt!
    annualRateBps: Int!
    termMonths: Int!
    paymentMinor: BigInt!
    calculationMethod: String!
    status: String!
    percentComplete: Float!
    remainingMinor: BigInt!
    nextDueDate: String
    nextScheduleInstallmentId: ID
    nextInstallmentNumber: Int
    moneyAccountId: ID
    moneyCategoryId: ID
  }

  type LoanDetail {
    id: ID!
    name: String!
    currency: String!
    principalMinor: BigInt!
    annualRateBps: Int!
    termMonths: Int!
    paymentMinor: BigInt!
    calculationMethod: String!
    status: String!
    percentComplete: Float!
    remainingMinor: BigInt!
    nextDueDate: String
    nextScheduleInstallmentId: ID
    nextInstallmentNumber: Int
    startDate: String!
    dueDayOfMonth: Int!
    initialRateMonths: Int
    rateAfterInitialBps: Int
    paymentAfterRateChangeMinor: BigInt
    collateralValueMinor: BigInt
    moneyAccountId: ID
    moneyCategoryId: ID
    summary: LoanSummary!
    chart: [LoanChartPoint!]!
    installments: [LoanInstallment!]!
  }

  type LoanDueInstallment {
    scheduleInstallmentId: ID!
    loanId: ID!
    loanName: String!
    installmentNumber: Int!
    dueDate: String!
    paymentMinor: BigInt!
    currency: String!
    moneyAccountId: ID
    moneyCategoryId: ID
  }

  type LoansInsightsSummary {
    remainingMinor: BigInt!
    monthlyObligationMinor: BigInt!
    weightedAprBps: Int
    nextDueDate: String
    loanCount: Int!
  }

  type LoansInsightsSlice {
    id: ID!
    label: String!
    valueMinor: BigInt!
  }

  type LoansInsightsRange {
    from: String!
    to: String!
  }

  type LoansInsightsAtf {
    range: LoansInsightsRange!
    summary: LoansInsightsSummary!
    remainingByLoan: [LoansInsightsSlice!]!
    paidPrincipalMinor: BigInt!
    paidInterestMinor: BigInt!
  }

  type LoansInsightsProgressRow {
    id: ID!
    name: String!
    remainingMinor: BigInt!
    percentComplete: Float!
  }

  type LoansInsightsMore {
    remainingInterestMinor: BigInt!
    ltvPct: Float
    progress: [LoansInsightsProgressRow!]!
    combinedChart: [LoanChartPoint!]!
  }

  input LoanCreateInput {
    name: String!
    principalMinor: BigInt!
    annualRateBps: Int!
    termMonths: Int!
    startDate: String!
    dueDayOfMonth: Int!
    paymentMinor: BigInt
    initialRateMonths: Int
    rateAfterInitialBps: Int
    paymentAfterRateChangeMinor: BigInt
    collateralValueMinor: BigInt
    moneyAccountId: ID
    moneyCategoryId: ID
    moneyWorkspaceId: ID
    autoMarkPastDuePaid: Boolean
    autoMarkPastDueWithoutTransaction: Boolean
  }

  input LoanInstallmentMarkPaidInput {
    scheduleInstallmentId: ID!
  }

  input LoanInstallmentPayWithTransactionInput {
    scheduleInstallmentId: ID!
    moneyWorkspaceId: ID
    accountId: ID!
    categoryId: ID
    notes: String
    occurredAt: String
    amountMinor: BigInt
  }

  input LoanPushSubscriptionSaveInput {
    endpoint: String!
    p256dh: String!
    auth: String!
  }

  input LoanPushSubscriptionDeleteInput {
    endpoint: String!
  }

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

  type InvestmentInsightsRange {
    from: String!
    to: String!
  }

  type InvestmentInsightsSummary {
    resultsMinor: BigInt!
    openNotionalMinor: BigInt!
    realizedPnlMinor: BigInt!
    openLotsCount: Int!
  }

  type InvestmentInsightsSlice {
    label: String!
    kind: String
    valueMinor: BigInt!
  }

  type InvestmentInsightsAtf {
    range: InvestmentInsightsRange!
    summary: InvestmentInsightsSummary!
    series: [InvestmentPortfolioPoint!]!
    allocation: [InvestmentInsightsSlice!]!
  }

  type InvestmentInsightsPnlRow {
    symbol: String!
    label: String!
    valueMinor: BigInt!
  }

  type InvestmentInsightsMore {
    realizedMinor: BigInt!
    unrealizedMinor: BigInt!
    maxDrawdownMinor: BigInt!
    closedCount: Int!
    winningClosedCount: Int!
    pnlBySymbol: [InvestmentInsightsPnlRow!]!
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

  extend type Query {
    loansBootstrap: LoansBootstrapPayload!
    loans: [LoanListItem!]!
    loan(id: ID!): LoanDetail!
    loansDueInstallments: [LoanDueInstallment!]!
    loansInsightsAtf(from: String!, to: String!): LoansInsightsAtf!
    loansInsightsMore(from: String!, to: String!): LoansInsightsMore!
    investmentBootstrap: InvestmentBootstrapPayload!
    investmentInstruments: [InvestmentInstrument!]!
    investmentActivities(query: InvestmentActivitiesQueryInput): InvestmentActivitiesConnection!
    investmentOpenActivities(instrumentId: ID): [InvestmentActivityRow!]!
    investmentActivity(id: ID!): InvestmentActivityRow
    investmentPortfolioValueSeries(from: String!, to: String!): [InvestmentPortfolioPoint!]!
    investmentHoldingsSnapshot: [InvestmentHoldingRow!]!
    investmentInsightsAtf(from: String!, to: String!): InvestmentInsightsAtf!
    investmentInsightsMore(from: String!, to: String!): InvestmentInsightsMore!
    investmentFxRate(from: String!, to: String!): InvestmentFxRate
  }

  extend type Mutation {
    loanCreate(input: LoanCreateInput!): LoanCreateResult!
    loanCancel(id: ID!): LoansOk!
    loanInstallmentMarkPaid(input: LoanInstallmentMarkPaidInput!): LoansOk!
    loanInstallmentPayWithTransaction(
      input: LoanInstallmentPayWithTransactionInput!
    ): LoanPayWithTransactionResult!
    loanPushSubscriptionSave(input: LoanPushSubscriptionSaveInput!): LoansOk!
    loanPushSubscriptionDelete(input: LoanPushSubscriptionDeleteInput!): LoansOk!
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
