import { defineConfig, devices } from '@playwright/test';
import {
  GLC_DEV_SPA_HOST_FOR_E2E,
  GLC_DEV_SPA_ORIGIN_E2E,
  GLC_DEV_SPA_PORT,
} from '@glc/dev-brand-defaults';

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
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: GLC_DEV_SPA_ORIGIN_E2E,
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },
  webServer: {
    command: `npm run dev -- --host ${GLC_DEV_SPA_HOST_FOR_E2E} --port ${GLC_DEV_SPA_PORT}`,
    url: GLC_DEV_SPA_ORIGIN_E2E,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
