export const SAVINGS_BOOTSTRAP_QUERY = /* GraphQL */ `
  query SavingsBootstrap {
    savingsBootstrap {
      workspaceId
      defaultCurrency
      needsCurrencySetup
      defaultWorkspaceId
      accountCount
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

export const SAVINGS_ACCOUNTS_QUERY = /* GraphQL */ `
  query SavingsAccounts {
    savingsAccounts {
      id
      name
      currency
      sortOrder
      archived
      balanceMinor
    }
  }
`;

export const SAVINGS_ACTIVITIES_QUERY = /* GraphQL */ `
  query SavingsActivities($query: SavingsActivitiesQueryInput) {
    savingsActivities(query: $query) {
      items {
        id
        accountId
        accountName
        accountCurrency
        activityDate
        type
        amountMinor
        notes
        moneyAccountId
        moneyTransactionId
      }
      nextCursor
    }
  }
`;

export const SAVINGS_BALANCE_SERIES_QUERY = /* GraphQL */ `
  query SavingsBalanceSeries($from: String!, $to: String!) {
    savingsBalanceSeries(from: $from, to: $to) {
      date
      totalMinor
    }
  }
`;

export const SAVINGS_ACCOUNT_CREATE_MUTATION = /* GraphQL */ `
  mutation SavingsAccountCreate($input: SavingsAccountCreateInput!) {
    savingsAccountCreate(input: $input) {
      id
      name
      currency
      sortOrder
      archived
      balanceMinor
    }
  }
`;

export const SAVINGS_ACCOUNT_UPDATE_MUTATION = /* GraphQL */ `
  mutation SavingsAccountUpdate($id: ID!, $input: SavingsAccountUpdateInput!) {
    savingsAccountUpdate(id: $id, input: $input) {
      id
      name
      currency
      sortOrder
      archived
      balanceMinor
    }
  }
`;

export const SAVINGS_ACTIVITY_CREATE_MUTATION = /* GraphQL */ `
  mutation SavingsActivityCreate($input: SavingsActivityCreateInput!) {
    savingsActivityCreate(input: $input) {
      id
    }
  }
`;

export const SAVINGS_ACTIVITY_UPDATE_MUTATION = /* GraphQL */ `
  mutation SavingsActivityUpdate($id: ID!, $input: SavingsActivityUpdateInput!) {
    savingsActivityUpdate(id: $id, input: $input) {
      id
    }
  }
`;

export const SAVINGS_ACTIVITY_DELETE_MUTATION = /* GraphQL */ `
  mutation SavingsActivityDelete($id: ID!) {
    savingsActivityDelete(id: $id) {
      ok
    }
  }
`;
