import { describe, expect, it } from 'vitest';
import { DISCOVERY_RESULTS_TEASER } from '@glc/intake-core';
import { DISCOVERY_INDUSTRY_TEASER_ICONS } from './discovery-industry-teaser-icons';

describe('DISCOVERY_INDUSTRY_TEASER_ICONS', () => {
  it('has an icon entry for every industry key in DISCOVERY_RESULTS_TEASER.industryTeaser', () => {
    const jsonKeys = Object.keys(DISCOVERY_RESULTS_TEASER.industryTeaser);
    for (const key of jsonKeys) {
      expect(DISCOVERY_INDUSTRY_TEASER_ICONS, `missing icon for industry teaser key: ${key}`).toHaveProperty(key);
    }
    expect(jsonKeys.length).toBeGreaterThan(0);
  });
});
