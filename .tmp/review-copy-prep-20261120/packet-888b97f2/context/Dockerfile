# syntax=docker/dockerfile:1
ARG NODE_BASE=node:24-bookworm-slim@sha256:dc26ae92c9fb15cf6b1d63e20f0944b2efe0f115b20e00be48fb23fceb061c54
FROM ${NODE_BASE} AS toolchain
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/payload.patch ./patches/payload.patch
RUN pnpm install --frozen-lockfile
COPY . .
ARG SOURCE_SHA
LABEL org.opencontainers.image.revision=${SOURCE_SHA}

FROM toolchain AS runner
USER node
CMD ["pnpm", "migrate"]

FROM toolchain AS builder
ARG NEXT_PUBLIC_SERVER_URL
RUN --network=none test "$(readlink /proc/$$/exe)" = /run/rosetta/rosetta \
    && test "$NEXT_PUBLIC_SERVER_URL" = https://preview.sophomores.co \
    && DATABASE_URI=postgresql://packaging:synthetic@127.0.0.1:1/packaging_only PAYLOAD_SECRET=build-validation-only-not-a-runtime-secret \
       node node_modules/next/dist/bin/next typegen \
    && node --max-old-space-size=2048 node_modules/typescript/bin/tsc --noEmit
RUN --network=none sed -i 's/experimental: { globalNotFound: true }/experimental: { globalNotFound: true, cpus: 3 },\n  typescript: { ignoreBuildErrors: true }/' next.config.ts \
    && grep -q 'globalNotFound: true, cpus: 3' next.config.ts \
    && DATABASE_URI=postgresql://packaging:synthetic@127.0.0.1:1/packaging_only PAYLOAD_SECRET=build-validation-only-not-a-runtime-secret \
       node --max-old-space-size=3072 node_modules/next/dist/bin/next build

FROM ${NODE_BASE} AS runtime
WORKDIR /app
ARG SOURCE_SHA
ARG NEXT_PUBLIC_SERVER_URL
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000 NEXT_PUBLIC_SERVER_URL=${NEXT_PUBLIC_SERVER_URL}
LABEL org.opencontainers.image.revision=${SOURCE_SHA}
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
COPY --from=builder --chown=node:node /app/public ./public
RUN mkdir -p /app/media && chown node:node /app/media
USER node
EXPOSE 3000
CMD ["node", "server.js"]
