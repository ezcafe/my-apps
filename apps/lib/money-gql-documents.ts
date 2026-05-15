/** Central GraphQL documents for the Money app (no codegen). */

export const MONEY_BOOTSTRAP_QUERY = /* GraphQL */ `
  query MoneyBootstrap {
    moneyBootstrap {
      workspaceId
      defaultCurrency
      needsCurrencySetup
      defaultWorkspaceId
      workspaces {
        id
        name
        kind
        ownedByUserSub
        defaultCurrency
        role
        isDefault
      }
      accounts
      categories
      merchants
      tags
    }
  }
`;

export const MONEY_ANALYTICS_PAGE_QUERY = /* GraphQL */ `
  query MoneyAnalyticsPage(
    $filters: AnalyticsFiltersInput!
    $includeSpent: Boolean!
    $budgetFrom: String
    $budgetTo: String
  ) {
    moneyAnalytics(filters: $filters)
    moneyBudgets(
      includeSpent: $includeSpent
      from: $budgetFrom
      to: $budgetTo
    )
  }
`;

export const MONEY_TRANSACTION_EDIT_QUERY = /* GraphQL */ `
  query MoneyTransactionEdit($id: ID!) {
    moneyAccounts
    moneyCategories
    moneyMerchants
    moneyTags
    moneyTransaction(id: $id)
  }
`;

export const MONEY_WORKSPACE_CURRENCY_MUTATION = /* GraphQL */ `
  mutation MoneyWorkspaceCurrency($workspaceId: ID!, $defaultCurrency: String!) {
    moneyWorkspaceCurrency(
      workspaceId: $workspaceId
      defaultCurrency: $defaultCurrency
    ) {
      workspaceId
      defaultCurrency
    }
  }
`;

export const MONEY_SET_ACTIVE_WORKSPACE_MUTATION = /* GraphQL */ `
  mutation MoneySetActiveWorkspace($workspaceId: ID!) {
    moneySetActiveWorkspace(workspaceId: $workspaceId, app: "money")
  }
`;

export const MONEY_TRANSACTION_CREATE_MUTATION = /* GraphQL */ `
  mutation MoneyTransactionCreate($input: JSONObject!) {
    moneyTransactionCreate(input: $input)
  }
`;

export const MONEY_TRANSACTION_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyTransactionUpdate($id: ID!, $input: JSONObject!) {
    moneyTransactionUpdate(id: $id, input: $input)
  }
`;

export const MONEY_TRANSACTION_DELETE_MUTATION = /* GraphQL */ `
  mutation MoneyTransactionDelete($id: ID!) {
    moneyTransactionDelete(id: $id) {
      ok
    }
  }
`;

export const MONEY_WORKSPACE_CLONE_MUTATION = /* GraphQL */ `
  mutation MoneyWorkspaceClone($targetWorkspaceId: ID!) {
    moneyWorkspaceClone(targetWorkspaceId: $targetWorkspaceId) {
      ok
    }
  }
`;

export const MONEY_WORKSPACE_RESET_MUTATION = /* GraphQL */ `
  mutation MoneyWorkspaceReset {
    moneyWorkspaceReset {
      ok
    }
  }
`;

export const MONEY_TRANSACTIONS_QUERY = /* GraphQL */ `
  query MoneyTransactions($query: JSONObject!) {
    moneyTransactions(query: $query) {
      data
      total
      page
      pageSize
    }
  }
`;

export const MONEY_PARSE_CSV_QUERY = /* GraphQL */ `
  query MoneyParseCsv($csv: String!) {
    moneyParseCsv(csv: $csv)
  }
`;

export const MONEY_LIST_ACCOUNTS_QUERY = /* GraphQL */ `
  query MoneyListAccounts {
    moneyAccounts
  }
`;

export const MONEY_LIST_CATEGORIES_QUERY = /* GraphQL */ `
  query MoneyListCategories {
    moneyCategories
  }
`;

export const MONEY_LIST_MERCHANTS_QUERY = /* GraphQL */ `
  query MoneyListMerchants {
    moneyMerchants
  }
`;

export const MONEY_LIST_TAGS_QUERY = /* GraphQL */ `
  query MoneyListTags {
    moneyTags
  }
`;

export const MONEY_LIST_RULES_QUERY = /* GraphQL */ `
  query MoneyListRules {
    moneyRules
  }
`;

export const MONEY_LIST_RECURRENCE_QUERY = /* GraphQL */ `
  query MoneyListRecurrence {
    moneyRecurrenceTemplates
  }
`;

export const MONEY_BUDGETS_FOR_RANGE_QUERY = /* GraphQL */ `
  query MoneyBudgetsRange($includeSpent: Boolean!, $from: String!, $to: String!) {
    moneyBudgets(includeSpent: $includeSpent, from: $from, to: $to)
  }
`;

export const MONEY_ACCOUNT_CREATE_MUTATION = /* GraphQL */ `
  mutation MoneyAccountCreate($input: JSONObject!) {
    moneyAccountCreate(input: $input)
  }
`;

export const MONEY_ACCOUNT_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyAccountUpdate($id: ID!, $input: JSONObject!) {
    moneyAccountUpdate(id: $id, input: $input)
  }
`;

export const MONEY_ACCOUNT_ARCHIVE_MUTATION = /* GraphQL */ `
  mutation MoneyAccountArchive($id: ID!) {
    moneyAccountArchive(id: $id) {
      ok
    }
  }
`;

export const MONEY_CATEGORY_CREATE_MUTATION = /* GraphQL */ `
  mutation MoneyCategoryCreate($input: JSONObject!) {
    moneyCategoryCreate(input: $input)
  }
`;

export const MONEY_CATEGORY_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyCategoryUpdate($id: ID!, $input: JSONObject!) {
    moneyCategoryUpdate(id: $id, input: $input)
  }
`;

export const MONEY_CATEGORY_ARCHIVE_MUTATION = /* GraphQL */ `
  mutation MoneyCategoryArchive($id: ID!) {
    moneyCategoryArchive(id: $id) {
      ok
    }
  }
`;

export const MONEY_MERCHANT_CREATE_MUTATION = /* GraphQL */ `
  mutation MoneyMerchantCreate($input: JSONObject!) {
    moneyMerchantCreate(input: $input)
  }
`;

export const MONEY_MERCHANT_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyMerchantUpdate($id: ID!, $input: JSONObject!) {
    moneyMerchantUpdate(id: $id, input: $input)
  }
`;

export const MONEY_MERCHANT_DELETE_MUTATION = /* GraphQL */ `
  mutation MoneyMerchantDelete($id: ID!) {
    moneyMerchantDelete(id: $id) {
      ok
    }
  }
`;

export const MONEY_TAG_CREATE_MUTATION = /* GraphQL */ `
  mutation MoneyTagCreate($input: JSONObject!) {
    moneyTagCreate(input: $input)
  }
`;

export const MONEY_TAG_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyTagUpdate($id: ID!, $input: JSONObject!) {
    moneyTagUpdate(id: $id, input: $input)
  }
`;

export const MONEY_TAG_DELETE_MUTATION = /* GraphQL */ `
  mutation MoneyTagDelete($id: ID!) {
    moneyTagDelete(id: $id) {
      ok
    }
  }
`;

export const MONEY_BUDGET_CREATE_MUTATION = /* GraphQL */ `
  mutation MoneyBudgetCreate($input: JSONObject!) {
    moneyBudgetCreate(input: $input)
  }
`;

export const MONEY_BUDGET_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyBudgetUpdate($id: ID!, $input: JSONObject!) {
    moneyBudgetUpdate(id: $id, input: $input)
  }
`;

export const MONEY_BUDGET_DELETE_MUTATION = /* GraphQL */ `
  mutation MoneyBudgetDelete($id: ID!) {
    moneyBudgetDelete(id: $id) {
      ok
    }
  }
`;

export const MONEY_RULE_CREATE_MUTATION = /* GraphQL */ `
  mutation MoneyRuleCreate($input: JSONObject!) {
    moneyRuleCreate(input: $input)
  }
`;

export const MONEY_RULE_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyRuleUpdate($id: ID!, $input: JSONObject!) {
    moneyRuleUpdate(id: $id, input: $input)
  }
`;

export const MONEY_RULE_DELETE_MUTATION = /* GraphQL */ `
  mutation MoneyRuleDelete($id: ID!) {
    moneyRuleDelete(id: $id) {
      ok
    }
  }
`;

export const MONEY_RECURRENCE_CREATE_MUTATION = /* GraphQL */ `
  mutation MoneyRecurrenceCreate($input: JSONObject!) {
    moneyRecurrenceCreate(input: $input)
  }
`;

export const MONEY_RECURRENCE_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyRecurrenceUpdate($id: ID!, $input: JSONObject!) {
    moneyRecurrenceUpdate(id: $id, input: $input)
  }
`;

export const MONEY_RECURRENCE_DELETE_MUTATION = /* GraphQL */ `
  mutation MoneyRecurrenceDelete($id: ID!) {
    moneyRecurrenceDelete(id: $id) {
      ok
    }
  }
`;

export const MONEY_RECURRENCE_GENERATE_MUTATION = /* GraphQL */ `
  mutation MoneyRecurrenceGenerate($id: ID!) {
    moneyRecurrenceGenerate(id: $id) {
      transaction
      nextRunAt
    }
  }
`;
