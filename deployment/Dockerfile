# Build with the CLI-created allowlisted source snapshot, never the repository root.
FROM --platform=$BUILDPLATFORM node:24-bookworm-slim AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# Corepack reads and verifies the exact pnpm version/integrity in packageManager.
RUN corepack install && pnpm install --frozen-lockfile
COPY . .
RUN pnpm test && pnpm exec next typegen && pnpm typecheck && pnpm build

FROM node:24-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
ARG RELEASE_ID=unknown
LABEL org.opencontainers.image.version=$RELEASE_ID
COPY --from=builder --chown=node:node /src/app/.next/standalone ./
COPY --from=builder --chown=node:node /src/app/.next/static ./.next/static
COPY --from=builder --chown=node:node /src/app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
