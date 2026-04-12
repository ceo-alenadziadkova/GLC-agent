/**
 * Chrome major version token embedded in Mozilla-compatible snapshot/Playwright user-agent strings.
 *
 * This is a **compatibility signal for remote sites**, not guaranteed to match the Chromium revision
 * bundled with the `playwright` package in server/package.json. Many stacks only parse the Chrome/x.y token.
 *
 * When you upgrade **`playwright`**, re-check whether target sites or WAF rules expect a newer major;
 * adjust this constant and redeploy. Release notes: https://playwright.dev/docs/release-notes
 *
 * Sanity: `pnpm -C server exec vitest run src/config/playwright-user-agent.test.ts` (token shape).
 */

export const PLAYWRIGHT_CHROME_MAJOR_FOR_UA = '120' as const;

export const PLAYWRIGHT_CHROME_FULL_VERSION_FOR_UA = `${PLAYWRIGHT_CHROME_MAJOR_FOR_UA}.0.0.0` as const;
