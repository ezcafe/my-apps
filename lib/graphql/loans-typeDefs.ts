export const loansTypeDefs = /* GraphQL */ `
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
    moneyWorkspaceId: ID!
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

  type Query {
    loansBootstrap: LoansBootstrapPayload!
    loans: [LoanListItem!]!
    loan(id: ID!): LoanDetail!
    loansDueInstallments: [LoanDueInstallment!]!
    loansInsightsAtf(from: String!, to: String!): LoansInsightsAtf!
    loansInsightsMore(from: String!, to: String!): LoansInsightsMore!
  }

  type Mutation {
    loanCreate(input: LoanCreateInput!): LoanCreateResult!
    loanCancel(id: ID!): LoansOk!
    loanInstallmentMarkPaid(input: LoanInstallmentMarkPaidInput!): LoansOk!
    loanInstallmentPayWithTransaction(
      input: LoanInstallmentPayWithTransactionInput!
    ): LoanPayWithTransactionResult!
    loanPushSubscriptionSave(input: LoanPushSubscriptionSaveInput!): LoansOk!
    loanPushSubscriptionDelete(input: LoanPushSubscriptionDeleteInput!): LoansOk!
  }
`;
