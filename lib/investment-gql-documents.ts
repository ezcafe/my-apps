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
      archived
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
        amountMinor
        notes
        moneyAccountId
        moneyTransactionId
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

export const INVESTMENT_INSTRUMENT_CREATE_MUTATION = /* GraphQL */ `
  mutation InvestmentInstrumentCreate($input: InvestmentInstrumentCreateInput!) {
    investmentInstrumentCreate(input: $input) {
      id
      kind
      name
      currency
      symbol
      yahooSymbol
      archived
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
      archived
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
