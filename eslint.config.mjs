import { defineConfig, globalIgnores } from "eslint/config";
import { fixupConfigRules } from "@eslint/compat";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  // eslint-plugin-react (and some peers) still call removed RuleContext methods;
  // @eslint/compat restores them for ESLint 10 until those plugins catch up.
  ...fixupConfigRules(nextVitals),
  ...fixupConfigRules(nextTs),
  {
    settings: {
      react: {
        version: "19.2",
      },
    },
  },
  {
    files: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}", "db/**/*.ts"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            'TaggedTemplateExpression[tag.name="sql"]:has(TemplateElement[value.raw=/^::\\w+\\[\\]/])',
          message:
            "Do not cast a bound JS array as a PG array in sql`…` (postgres.js sends single-element arrays as plain strings). Use inArray() or sql.join(ids.map((id) => sql`${id}::uuid`), sql`, `). See AGENTS.md → Database / Drizzle.",
        },
        {
          selector:
            'TaggedTemplateExpression[tag.name="sql"]:has(TemplateElement[value.raw=/SUM/i]):has(TemplateElement[value.raw=/\\)::int/])',
          message:
            "Do not cast SUM of bigint money columns to ::int (PG error 22003 when totals exceed ~2.1B). Use ::bigint or omit the cast. count(*)::int is OK. See AGENTS.md → Database / Drizzle.",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // CJS resolve shim for typescript-eslint ↔ TypeScript 7 dual install
    "scripts/resolve-typescript6.cjs",
  ]),
]);

export default eslintConfig;
