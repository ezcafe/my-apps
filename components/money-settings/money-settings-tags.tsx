"use client";

import {
  MONEY_LIST_TAGS_QUERY,
  MONEY_TAG_CREATE_MUTATION,
  MONEY_TAG_DELETE_MUTATION,
  MONEY_TAG_UPDATE_MUTATION,
} from "@/lib/money-gql-documents";
import { MoneyNamedEntitySettingsSection } from "@/components/money-settings/money-settings-named-entity";

export function MoneySettingsTagsSection() {
  return (
    <MoneyNamedEntitySettingsSection
      config={{
        sectionId: "money-settings-tags-page",
        title: "Tags",
        description:
          "Optional labels you can add to transactions for filtering.",
        entityLabel: "Tag",
        entityLabelLower: "tag",
        existingHeading: "Existing tags",
        addHeading: "Add tag",
        addButtonLabel: "Add tag",
        namePlaceholder: "vacation",
        importHref: "/money/import/tags",
        errorScope: "money-settings-tags",
        listQuery: MONEY_LIST_TAGS_QUERY,
        listKey: "moneyTags",
        createMutation: MONEY_TAG_CREATE_MUTATION,
        updateMutation: MONEY_TAG_UPDATE_MUTATION,
        deleteMutation: MONEY_TAG_DELETE_MUTATION,
      }}
    />
  );
}
