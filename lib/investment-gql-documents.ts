export const INVESTMENT_BOOTSTRAP_QUERY = /* GraphQL */ `
  query InvestmentBootstrap {
    investmentBootstrap {
      workspaceId
      defaultCurrency
      needsCurrencySetup
      defaultWorkspaceId
      instrumentCount
      workspaces {
        id
        name
        kind
        defaultCurrency
        role
        isDefault
      }
    }
  }
`;

export const INVESTMENT_INSTRUMENTS_QUERY = /* GraphQL */ `
  query InvestmentInstruments {
    investmentInstruments {
      id
      kind
      name
      currency
      symbol
      yahooSymbol
      contractSize
      archived
      moneyAccountId
      incomeCategoryId
      expenseCategoryId
    }
  }
`;

export const INVESTMENT_ACTIVITIES_QUERY = /* GraphQL */ `
  query InvestmentActivities($query: InvestmentActivitiesQueryInput) {
    investmentActivities(query: $query) {
      items {
        id
        instrumentId
        instrumentName
        instrumentKind
        instrumentSymbol
        instrumentCurrency
        activityDate
        type
        quantity
        unitPriceMinor
        openPrice
        closePrice
        stopLoss
        takeProfit
        amountMinor
        notes
        moneyAccountId
        moneyTransactionId
        status
      }
      nextCursor
    }
  }
`;

export const INVESTMENT_PORTFOLIO_SERIES_QUERY = /* GraphQL */ `
  query InvestmentPortfolioValueSeries($from: String!, $to: String!) {
    investmentPortfolioValueSeries(from: $from, to: $to) {
      date
      totalMinor
    }
  }
`;

export const INVESTMENT_INSIGHTS_ATF_QUERY = /* GraphQL */ `
  query InvestmentInsightsAtf($from: String!, $to: String!) {
    investmentInsightsAtf(from: $from, to: $to) {
      range {
        from
        to
      }
      summary {
        resultsMinor
        openNotionalMinor
        realizedPnlMinor
        openLotsCount
      }
      series {
        date
        totalMinor
      }
      allocation {
        label
        kind
        valueMinor
      }
    }
  }
`;

export const INVESTMENT_INSIGHTS_MORE_QUERY = /* GraphQL */ `
  query InvestmentInsightsMore($from: String!, $to: String!) {
    investmentInsightsMore(from: $from, to: $to) {
      realizedMinor
      unrealizedMinor
      maxDrawdownMinor
      closedCount
      winningClosedCount
      pnlBySymbol {
        symbol
        label
        valueMinor
      }
    }
  }
`;

export const INVESTMENT_HOLDINGS_QUERY = /* GraphQL */ `
  query InvestmentHoldingsSnapshot {
    investmentHoldingsSnapshot {
      instrumentId
      kind
      name
      symbol
      currency
      quantity
      priceMinor
      valueMinor
      quoteAsOf
    }
  }
`;

export const INVESTMENT_TOP_QUANTITIES_QUERY = /* GraphQL */ `
  query InvestmentTopQuantities {
    investmentTopQuantities
  }
`;

export const INVESTMENT_INSTRUMENT_CREATE_MUTATION = /* GraphQL */ `
  mutation InvestmentInstrumentCreate($input: InvestmentInstrumentCreateInput!) {
    investmentInstrumentCreate(input: $input) {
      id
      kind
      name
      currency
      symbol
      yahooSymbol
      contractSize
      archived
      moneyAccountId
      incomeCategoryId
      expenseCategoryId
    }
  }
`;

export const INVESTMENT_INSTRUMENT_UPDATE_MUTATION = /* GraphQL */ `
  mutation InvestmentInstrumentUpdate($id: ID!, $input: InvestmentInstrumentUpdateInput!) {
    investmentInstrumentUpdate(id: $id, input: $input) {
      id
      kind
      name
      currency
      symbol
      yahooSymbol
      contractSize
      archived
      moneyAccountId
      incomeCategoryId
      expenseCategoryId
    }
  }
`;

export const INVESTMENT_OPEN_ACTIVITIES_QUERY = /* GraphQL */ `
  query InvestmentOpenActivities($instrumentId: ID) {
    investmentOpenActivities(instrumentId: $instrumentId) {
      id
      instrumentId
      instrumentName
      instrumentSymbol
      instrumentCurrency
      activityDate
      type
      quantity
      openPrice
      stopLoss
      takeProfit
      status
    }
  }
`;

export const INVESTMENT_FX_RATE_QUERY = /* GraphQL */ `
  query InvestmentFxRate($from: String!, $to: String!) {
    investmentFxRate(from: $from, to: $to) {
      rate
      sourceSymbol
      inverted
      asOf
    }
  }
`;

export const INVESTMENT_ACTIVITY_CREATE_MUTATION = /* GraphQL */ `
  mutation InvestmentActivityCreate($input: InvestmentActivityCreateInput!) {
    investmentActivityCreate(input: $input) {
      id
    }
  }
`;

export const INVESTMENT_ACTIVITY_CLOSE_MUTATION = /* GraphQL */ `
  mutation InvestmentActivityClose($input: InvestmentActivityCloseInput!) {
    investmentActivityClose(input: $input) {
      id
      moneyTransactionId
    }
  }
`;

export const INVESTMENT_ACTIVITY_REALIZE_MUTATION = /* GraphQL */ `
  mutation InvestmentActivityRealize($input: InvestmentActivityRealizeInput!) {
    investmentActivityRealize(input: $input) {
      id
      moneyTransactionId
    }
  }
`;

export const INVESTMENT_ACTIVITY_CASH_MOVE_MUTATION = /* GraphQL */ `
  mutation InvestmentActivityCashMove($input: InvestmentActivityCashMoveInput!) {
    investmentActivityCashMove(input: $input) {
      id
      moneyTransactionId
    }
  }
`;

export const INVESTMENT_ACTIVITY_UPDATE_MUTATION = /* GraphQL */ `
  mutation InvestmentActivityUpdate($id: ID!, $input: InvestmentActivityUpdateInput!) {
    investmentActivityUpdate(id: $id, input: $input) {
      id
    }
  }
`;

export const INVESTMENT_ACTIVITY_DELETE_MUTATION = /* GraphQL */ `
  mutation InvestmentActivityDelete($id: ID!) {
    investmentActivityDelete(id: $id) {
      ok
    }
  }
`;

export const INVESTMENT_REFRESH_QUOTES_MUTATION = /* GraphQL */ `
  mutation InvestmentRefreshQuotes {
    investmentRefreshQuotes {
      ok
    }
  }
`;
