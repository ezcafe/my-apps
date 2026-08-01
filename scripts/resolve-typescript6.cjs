/**
 * Redirect `require("typescript")` / `import("typescript")` to
 * `@typescript/typescript6` so typescript-eslint keeps a JS Compiler API
 * while the project root uses TypeScript 7's native package.
 *
 * Used only via: NODE_OPTIONS='--require ./scripts/resolve-typescript6.cjs'
 */
"use strict";

const Module = require("node:module");

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveTypescript6(
  request,
  parent,
  isMain,
  options,
) {
  if (request === "typescript" || request.startsWith("typescript/")) {
    const redirected =
      request === "typescript"
        ? "@typescript/typescript6"
        : `@typescript/typescript6${request.slice("typescript".length)}`;
    return originalResolveFilename.call(this, redirected, parent, isMain, options);
  }
  return originalResolveFilename.call(this, request, parent, isMain, options);
};
