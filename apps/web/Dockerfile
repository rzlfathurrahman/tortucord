# Multi-stage optimized Dockerfile for Tortuga Web Dashboard (Next.js Standalone)
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.20.0 --activate
RUN apk add --no-cache libc6-compat openssl

FROM base AS builder
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json turbo.json tsconfig.base.json ./
COPY packages/config/package.json ./packages/config/
COPY packages/database/package.json ./packages/database/
COPY packages/tagscript/package.json ./packages/tagscript/
COPY packages/mcp/package.json ./packages/mcp/
COPY apps/web/package.json ./apps/web/

RUN pnpm install --frozen-lockfile

COPY packages/config ./packages/config
COPY packages/database ./packages/database
COPY packages/tagscript ./packages/tagscript
COPY packages/mcp ./packages/mcp
COPY apps/web ./apps/web

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"

RUN pnpm --filter @tortuga/config build
RUN pnpm --filter @tortuga/database generate
RUN pnpm --filter @tortuga/database build
RUN pnpm --filter @tortuga/tagscript build
RUN pnpm --filter @tortuga/mcp build
RUN pnpm --filter @tortuga/web build

# Locate and stage Prisma query engine binaries for standalone runner
RUN mkdir -p /tmp/prisma-engines && \
    find /app/node_modules -name "libquery_engine-*.so.node" -exec cp {} /tmp/prisma-engines/ \; 2>/dev/null || true

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy Next.js standalone output
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

# Copy Prisma query engine binaries to searched locations
COPY --from=builder /tmp/prisma-engines /tmp/prisma-engines
RUN mkdir -p ./apps/web/.next/server ./apps/web/.next/cache && \
    cp /tmp/prisma-engines/* ./apps/web/.next/server/ 2>/dev/null || true && \
    chown -R nextjs:nodejs /app /tmp/prisma-engines

USER nextjs

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
