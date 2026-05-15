/**
 * Money feature public barrel. Prefer importing domain helpers from here so paths
 * stay stable if files move under `features/money/`.
 *
 * Money HTTP reads/writes use GraphQL (`@/lib/gql-client`, `@/lib/money-gql-documents`);
 * multipart import stays on REST under `/api/money/import/*`.
 */
export {};
