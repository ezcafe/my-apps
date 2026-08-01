import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

// Import compiled path via dynamic import of the TS module is not available in plain node;
// the schema is a static string export.
const schemaPath = join(root, "lib/graphql/money-typeDefs.ts");
const src = readFileSync(schemaPath, "utf8");
const match = /export const moneyTypeDefs = \/\* GraphQL \*\/ `([\s\S]*?)`;/m.exec(
  src,
);
if (!match) {
  console.error("Could not extract moneyTypeDefs from", schemaPath);
  process.exit(1);
}
const sdl = match[1];

const out = join(root, "docs/money.graphql");
writeFileSync(out, `${sdl.trim()}\n`, "utf8");
console.log("Wrote", out);
