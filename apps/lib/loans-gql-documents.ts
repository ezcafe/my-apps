export const LOANS_BOOTSTRAP_QUERY = /* GraphQL */ `
  query LoansBootstrap {
    loansBootstrap {
      workspaceId
      defaultCurrency
      needsCurrencySetup
      defaultWorkspaceId
      dueCount
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

export const LOANS_LIST_QUERY = /* GraphQL */ `
  query LoansList {
    loans {
      id
      name
      currency
      principalMinor
      annualRateBps
      termMonths
      paymentMinor
      calculationMethod
      status
      percentComplete
      remainingMinor
      nextDueDate
    }
  }
`;

export const LOAN_DETAIL_QUERY = /* GraphQL */ `
  query LoanDetail($id: ID!) {
    loan(id: $id) {
      id
      name
      currency
      principalMinor
      annualRateBps
      termMonths
      paymentMinor
      calculationMethod
      status
      startDate
      dueDayOfMonth
      collateralValueMinor
      moneyAccountId
      moneyCategoryId
      percentComplete
      remainingMinor
      nextDueDate
      summary {
        totalPaidMinor
        remainingMinor
        percentComplete
        projectedPayoffDate
        monthsAheadBehind
      }
      chart {
        label
        scheduledCumulativeMinor
        actualCumulativeMinor
        projectedCumulativeMinor
      }
      installments {
        scheduleInstallmentId
        installmentNumber
        dueDate
        paymentMinor
        principalMinor
        interestMinor
        balanceAfterMinor
        status
        paidAt
        moneyTransactionId
        paidWithoutTransaction
      }
    }
  }
`;

export const LOANS_DUE_QUERY = /* GraphQL */ `
  query LoansDue {
    loansDueInstallments {
      scheduleInstallmentId
      loanId
      loanName
      installmentNumber
      dueDate
      paymentMinor
      currency
    }
  }
`;

export const LOAN_CREATE_MUTATION = /* GraphQL */ `
  mutation LoanCreate($input: LoanCreateInput!) {
    loanCreate(input: $input) {
      id
    }
  }
`;

export const LOAN_CANCEL_MUTATION = /* GraphQL */ `
  mutation LoanCancel($id: ID!) {
    loanCancel(id: $id) {
      ok
    }
  }
`;

export const LOAN_INSTALLMENT_MARK_PAID_MUTATION = /* GraphQL */ `
  mutation LoanInstallmentMarkPaid($input: LoanInstallmentMarkPaidInput!) {
    loanInstallmentMarkPaid(input: $input) {
      ok
    }
  }
`;

export const LOAN_INSTALLMENT_PAY_MUTATION = /* GraphQL */ `
  mutation LoanInstallmentPay($input: LoanInstallmentPayWithTransactionInput!) {
    loanInstallmentPayWithTransaction(input: $input) {
      ok
      moneyTransactionId
    }
  }
`;

export const LOAN_PUSH_SAVE_MUTATION = /* GraphQL */ `
  mutation LoanPushSave($input: LoanPushSubscriptionSaveInput!) {
    loanPushSubscriptionSave(input: $input) {
      ok
    }
  }
`;

export const LOAN_PUSH_DELETE_MUTATION = /* GraphQL */ `
  mutation LoanPushDelete($input: LoanPushSubscriptionDeleteInput!) {
    loanPushSubscriptionDelete(input: $input) {
      ok
    }
  }
`;
