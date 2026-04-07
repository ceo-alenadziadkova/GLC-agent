# Production API image — avoids Railpack apt/mise hangs on some Railway builders.
# Root Directory in Railway must stay `server` (this folder).

FROM node:22-bookworm-slim

WORKDIR /app

# Do not set NODE_ENV=production before install/build — pnpm would skip devDependencies
# and `typescript` / `tsc` would be missing for `pnpm run build`.
# Skip browser fetch during `pnpm install` only; we install Chromium explicitly after build (see below).
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

# Snapshot tier-3: headless Chromium for client-shell homepages (fetch-tiered → playwright-fetch).
# --with-deps installs Debian packages required on slim images; matches server/src/snapshot/playwright-fetch.ts.
RUN pnpm exec playwright install --with-deps chromium

ENV NODE_ENV=production
RUN pnpm prune --prod

# Railway injects PORT; Express reads process.env.PORT
CMD ["node", "dist/index.js"]
