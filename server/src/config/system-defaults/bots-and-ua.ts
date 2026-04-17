/**
 * Chrome major token in Mozilla-compatible snapshot/Playwright user-agent strings.
 * Revisit when upgrading the `playwright` package (see `playwright-user-agent.ts`).
 */
export const SYSTEM_DEFAULTS_PLAYWRIGHT_SNAPSHOT_USER_AGENT = {
  chromeMajor: '120',
} as const;

/**
 * Version token in `GLC-*` product names inside outbound user-agents (not the Chromium build string).
 * Bump when you intentionally change how we identify bots to external sites.
 */
export const SYSTEM_DEFAULTS_OUTBOUND_BOT = {
  uaProductVersion: '1.0',
} as const;
