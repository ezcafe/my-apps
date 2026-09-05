"use client";

import {
  MONEY_LIST_MERCHANTS_QUERY,
  MONEY_MERCHANT_CREATE_MUTATION,
  MONEY_MERCHANT_DELETE_MUTATION,
  MONEY_MERCHANT_UPDATE_MUTATION,
} from "@/lib/money-gql-documents";
import { MoneyNamedEntitySettingsSection } from "@/components/money-settings/money-settings-named-entity";

export function MoneySettingsMerchantsSection() {
  return (
    <MoneyNamedEntitySettingsSection
      config={{
        sectionId: "money-settings-merchants-page",
        title: "Merchants",
        description: "Payee names used for rules and transaction matching.",
        entityLabel: "Merchant",
        entityLabelLower: "merchant",
        existingHeading: "Existing merchants",
        addHeading: "Add merchant",
        addButtonLabel: "Add merchant",
        namePlaceholder: "Coffee shop",
        importHref: "/money/import/merchants",
        errorScope: "money-settings-merchants",
        listQuery: MONEY_LIST_MERCHANTS_QUERY,
        listKey: "moneyMerchants",
        createMutation: MONEY_MERCHANT_CREATE_MUTATION,
        updateMutation: MONEY_MERCHANT_UPDATE_MUTATION,
        deleteMutation: MONEY_MERCHANT_DELETE_MUTATION,
      }}
    />
  );
}
