import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";

function readAppFile(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("money GraphQL input typing", () => {
  it("uses typed create/update inputs in app mutation documents", () => {
    const docs = readAppFile("lib/money-gql-documents.ts");
    assert.match(docs, /MoneyBudgetCreateInput!/);
    assert.doesNotMatch(
      docs,
      /mutation\s+Money(?:Account|Category|Merchant|Tag|Budget|Rule|Recurrence)(?:Create|Update)\([^)]*\$input:\s*JSONObject!/,
    );
  });

  it("uses typed create/update inputs in API helper mutation examples", () => {
    const apiHelp = readAppFile("lib/api-help-content.ts");
    assert.doesNotMatch(
      apiHelp,
      /query:\s*`mutation\([^)]*\$input:\s*JSONObject!\)\s*\{\s*money(?:Account|Category|Merchant|Tag|Budget|Rule|Recurrence|Transaction)(?:Create|Update)\(input:\s*\$input\)/,
    );
  });

  it("keeps docs schema signatures aligned for create/update inputs", () => {
    const docsSchema = readAppFile("docs/money.graphql");
    assert.doesNotMatch(
      docsSchema,
      /money(?:Account|Category|Merchant|Tag|Budget|Rule|Recurrence|Transaction)(?:Create|Update)\([^)]*input:\s*JSONObject!\)/,
    );
  });
});
