# Multi-stage optimized Dockerfile for Tortuga Discord Bot
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
COPY apps/bot/package.json ./apps/bot/

RUN pnpm install --frozen-lockfile

COPY packages/config ./packages/config
COPY packages/database ./packages/database
COPY packages/tagscript ./packages/tagscript
COPY packages/mcp ./packages/mcp
COPY apps/bot ./apps/bot

ENV DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
RUN pnpm --filter @tortuga/database generate
RUN pnpm --filter @tortuga/config build
RUN pnpm --filter @tortuga/database build
RUN pnpm --filter @tortuga/tagscript build
RUN pnpm --filter @tortuga/mcp build
RUN pnpm --filter @tortuga/bot build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 tortuga

COPY --from=builder --chown=tortuga:nodejs /app /app

USER tortuga

CMD ["node", "apps/bot/dist/index.js"]
