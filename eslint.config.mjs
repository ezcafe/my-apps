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
