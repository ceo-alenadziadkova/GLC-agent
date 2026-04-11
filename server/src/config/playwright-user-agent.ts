/**
 * Chrome major version token embedded in Playwright / head-probe user-agent strings.
 * Update when bumping the pinned Playwright browser image.
 */

export const PLAYWRIGHT_CHROME_MAJOR_FOR_UA = '120' as const;

export const PLAYWRIGHT_CHROME_FULL_VERSION_FOR_UA = `${PLAYWRIGHT_CHROME_MAJOR_FOR_UA}.0.0.0` as const;
