import { describe, expect, it } from 'vitest';
import { PLAYWRIGHT_CHROME_FULL_VERSION_FOR_UA, PLAYWRIGHT_CHROME_MAJOR_FOR_UA } from './playwright-user-agent.js';

describe('playwright-user-agent', () => {
  it('keeps a plausible Chrome major token (digits only)', () => {
    expect(PLAYWRIGHT_CHROME_MAJOR_FOR_UA).toMatch(/^\d{2,3}$/);
  });

  it('derives full version from major', () => {
    expect(PLAYWRIGHT_CHROME_FULL_VERSION_FOR_UA).toBe(`${PLAYWRIGHT_CHROME_MAJOR_FOR_UA}.0.0.0`);
  });
});
