# Build with the CLI-created allowlisted source snapshot, never the repository root.
FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/payload.patch ./patches/payload.patch
# Corepack reads and verifies the exact pnpm version/integrity in packageManager.
RUN corepack install && pnpm install --frozen-lockfile
COPY . .
# Validation-only placeholders: this instruction cannot reach a real database or
# provider. Do not persist them with ENV/ARG or copy private environment files.
# Static generation that needs data still requires a separately reviewed build.
# Owner-deferred CSS has a separate visible report; default pnpm test is unchanged.
RUN --network=none export DATABASE_URI=postgresql://packaging:synthetic@127.0.0.1:1/packaging_only \
    PAYLOAD_SECRET=build-validation-only-not-a-runtime-secret \
    && pnpm test:functional && pnpm exec next typegen && pnpm typecheck && pnpm build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
ARG RELEASE_ID=unknown
LABEL org.opencontainers.image.version=$RELEASE_ID
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
