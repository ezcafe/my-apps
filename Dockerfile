# syntax=docker/dockerfile:1.7
# Example: docker build --target runner .
# Or: npm run docker:up

FROM node:22.22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app

FROM base AS deps
# npm 12 requires Node ^22.22.2 || ^24.15.0 || >=26; pin CLI for allowScripts defaults
RUN npm install -g npm@12
COPY package.json package-lock.json .npmrc ./
RUN npm ci

FROM deps AS builder
ENV AUTH_SECRET=docker-build-placeholder
ENV AUTH_URL=http://localhost:3000
ENV AUTH_POCKET_ID_ISSUER=https://id.example.com
ENV AUTH_POCKET_ID_ID=docker-build-client
ENV AUTH_POCKET_ID_SECRET=docker-build-secret
COPY . .
RUN npx next build --webpack

FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY drizzle.config.ts ./drizzle.config.ts
COPY db ./db
CMD ["node", "./node_modules/drizzle-kit/bin.cjs", "migrate"]

FROM gcr.io/distroless/nodejs22-debian12:nonroot AS runner
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
WORKDIR /app
COPY --from=builder --chown=nonroot:nonroot /app/public ./public
COPY --from=builder --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/.next/static ./.next/static
EXPOSE 3000
CMD ["server.js"]
