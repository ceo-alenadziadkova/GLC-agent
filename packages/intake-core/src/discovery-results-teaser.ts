/**
 * Post-Discovery results teaser copy (industry-specific fourth bullet + default).
 * Consumed by the SPA results screen; keep bank industry labels aligned with `a2` catalog.
 */
import raw from './discovery-results-teaser.v1.json' with { type: 'json' };

export type DiscoveryResultsTeaserV1 = {
  version: string;
  industryTeaser: Record<string, string>;
  defaultFourthBullet: string;
};

export const DISCOVERY_RESULTS_TEASER: DiscoveryResultsTeaserV1 = raw as DiscoveryResultsTeaserV1;
