import { defineConfig, devices } from '@playwright/test';
// Load from source: package.json exports point at dist/, which CI may not build before Playwright loads this file.
import {
  GLC_DEV_SPA_HOST_FOR_E2E,
  GLC_DEV_SPA_ORIGIN_E2E,
  GLC_DEV_SPA_PORT,
} from './packages/glc-dev-brand-defaults/src/index.ts';
import { PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS } from './e2e/defaults';

/**
 * Browser smoke tests against the Vite dev server.
 * Full auth + snapshot flows need a real Supabase project (see e2e/README.md).
 */
export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter:
    process.env.E2E_ORCHESTRATION_JSON === '1'
      ? [
          ['github'],
          ['json', { outputFile: 'test-results/orchestration-e2e.json' }],
        ]
      : process.env.CI
        ? 'github'
        : 'list',
  use: {
    baseURL: GLC_DEV_SPA_ORIGIN_E2E,
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `npm run dev -- --host ${GLC_DEV_SPA_HOST_FOR_E2E} --port ${GLC_DEV_SPA_PORT}`,
    url: GLC_DEV_SPA_ORIGIN_E2E,
    reuseExistingServer: !process.env.CI,
    timeout: PLAYWRIGHT_WEB_SERVER_TIMEOUT_MS,
  },
});
