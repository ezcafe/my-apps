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
      tags
    }
  }
`;

export const MONEY_WORKSPACE_STATE_QUERY = /* GraphQL */ `
  query MoneyWorkspaceState {
    moneyWorkspaceState {
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
    }
  }
`;

export const MONEY_FORM_LOOKUPS_QUERY = /* GraphQL */ `
  query MoneyFormLookups {
    moneyAccounts
    moneyCategories
    moneyMerchants
    moneyTopAmounts
  }
`;

export const MONEY_ANALYTICS_CHART_LOOKUPS_QUERY = /* GraphQL */ `
  query MoneyAnalyticsChartLookups {
    moneyAccounts
    moneyCategories
    moneyTags
  }
`;

export const MONEY_ANALYTICS_MERCHANT_LOOKUPS_QUERY = /* GraphQL */ `
  query MoneyAnalyticsMerchantLookups {
    moneyMerchants
  }
`;

export const MONEY_ANALYTICS_OVERVIEW_QUERY = /* GraphQL */ `
  query MoneyAnalyticsOverview($filters: AnalyticsFiltersInput!) {
    moneyAnalyticsOverview(filters: $filters)
  }
`;

export const MONEY_ANALYTICS_SUMMARY_QUERY = /* GraphQL */ `
  query MoneyAnalyticsSummary($filters: AnalyticsFiltersInput!) {
    moneyAnalyticsSummary(filters: $filters)
  }
`;

export const MONEY_ANALYTICS_DASHBOARD_QUERY = /* GraphQL */ `
  query MoneyAnalyticsDashboard($filters: AnalyticsFiltersInput!) {
    moneyAnalyticsSummary(filters: $filters)
    moneyAnalyticsOverview(filters: $filters)
  }
`;

export const MONEY_ANALYTICS_DISTRIBUTION_QUERY = /* GraphQL */ `
  query MoneyAnalyticsDistribution($filters: AnalyticsFiltersInput!) {
    moneyAnalyticsDistribution(filters: $filters)
  }
`;

export const MONEY_ANALYTICS_BUDGETS_QUERY = /* GraphQL */ `
  query MoneyAnalyticsBudgets($filters: AnalyticsFiltersInput!) {
    moneyAnalyticsBudgets(filters: $filters)
  }
`;

export const MONEY_ANALYTICS_SANKEY_QUERY = /* GraphQL */ `
  query MoneyAnalyticsSankey($filters: AnalyticsFiltersInput!) {
    moneyAnalyticsSankey(filters: $filters)
  }
`;

export const MONEY_ANALYTICS_LEADERS_QUERY = /* GraphQL */ `
  query MoneyAnalyticsLeaders($filters: AnalyticsFiltersInput!) {
    moneyAnalyticsLeaders(filters: $filters)
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
  mutation MoneyTransactionCreate($input: MoneyTransactionCreateInput!) {
    moneyTransactionCreate(input: $input)
  }
`;

export const MONEY_TRANSACTION_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyTransactionUpdate($id: ID!, $input: MoneyTransactionUpdateInput!) {
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

export const MONEY_CATEGORY_BUDGET_STATUS_QUERY = /* GraphQL */ `
  query MoneyCategoryBudgetStatus($from: String!, $to: String!) {
    moneyCategoryBudgetStatus(from: $from, to: $to)
  }
`;

export const MONEY_ACCOUNT_CREATE_MUTATION = /* GraphQL */ `
  mutation MoneyAccountCreate($input: MoneyAccountCreateInput!) {
    moneyAccountCreate(input: $input)
  }
`;

export const MONEY_ACCOUNT_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyAccountUpdate($id: ID!, $input: MoneyAccountUpdateInput!) {
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
  mutation MoneyCategoryCreate($input: MoneyCategoryCreateInput!) {
    moneyCategoryCreate(input: $input)
  }
`;

export const MONEY_CATEGORY_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyCategoryUpdate($id: ID!, $input: MoneyCategoryUpdateInput!) {
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
  mutation MoneyMerchantCreate($input: MoneyMerchantCreateInput!) {
    moneyMerchantCreate(input: $input)
  }
`;

export const MONEY_MERCHANT_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyMerchantUpdate($id: ID!, $input: MoneyMerchantUpdateInput!) {
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
  mutation MoneyTagCreate($input: MoneyTagCreateInput!) {
    moneyTagCreate(input: $input)
  }
`;

export const MONEY_TAG_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyTagUpdate($id: ID!, $input: MoneyTagUpdateInput!) {
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
  mutation MoneyBudgetCreate($input: MoneyBudgetCreateInput!) {
    moneyBudgetCreate(input: $input)
  }
`;

export const MONEY_BUDGET_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyBudgetUpdate($id: ID!, $input: MoneyBudgetUpdateInput!) {
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
  mutation MoneyRuleCreate($input: MoneyRuleCreateInput!) {
    moneyRuleCreate(input: $input)
  }
`;

export const MONEY_RULE_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyRuleUpdate($id: ID!, $input: MoneyRuleUpdateInput!) {
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
  mutation MoneyRecurrenceCreate($input: MoneyRecurrenceCreateInput!) {
    moneyRecurrenceCreate(input: $input)
  }
`;

export const MONEY_RECURRENCE_UPDATE_MUTATION = /* GraphQL */ `
  mutation MoneyRecurrenceUpdate($id: ID!, $input: MoneyRecurrenceUpdateInput!) {
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
