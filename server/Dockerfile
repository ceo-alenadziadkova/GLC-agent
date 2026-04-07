# Production API image — avoids Railpack apt/mise hangs on some Railway builders.
# Root Directory in Railway must stay `server` (this folder).

FROM node:22-bookworm-slim

WORKDIR /app

ENV NODE_ENV=production
# Faster install; for snapshot Chromium in prod run `playwright install chromium` in build or a release image.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build

RUN pnpm prune --prod

# Railway injects PORT; Express reads process.env.PORT
CMD ["node", "dist/index.js"]
