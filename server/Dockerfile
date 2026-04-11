# Production API image — build from repository root (not from server/ alone):
#   docker build -f server/Dockerfile .
# Railway: set the service Root Directory to the repo root and use railway.json at repo root.

FROM node:22-bookworm-slim

WORKDIR /app

ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# Chromium for Lighthouse (chrome-launcher). Playwright snapshot/axe still use the browser from `playwright install chromium`.
RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_PATH=/usr/bin/chromium

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/intake-core ./packages/intake-core
COPY packages/glc-dev-brand-defaults ./packages/glc-dev-brand-defaults
COPY server ./server

RUN pnpm install --frozen-lockfile --filter glc-audit-server...

WORKDIR /app/server

RUN pnpm run build

RUN PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=0 pnpm exec playwright install --with-deps chromium

WORKDIR /app
ENV NODE_ENV=production
RUN pnpm install --frozen-lockfile --filter glc-audit-server... --prod

WORKDIR /app/server

CMD ["node", "dist/index.js"]
