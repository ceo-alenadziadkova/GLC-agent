/**
 * Phosphor icons for `DISCOVERY_RESULTS_TEASER.industryTeaser` keys (@glc/intake-core JSON).
 * Parity with JSON keys is enforced by `discovery-industry-teaser-icons.test.ts`.
 */
import type { Icon } from '@phosphor-icons/react';
import { ChartLine, HandshakeIcon, Robot, Star, Users } from '@phosphor-icons/react';

export const DISCOVERY_INDUSTRY_TEASER_ICONS: Record<string, Icon> = {
  Hospitality: Star,
  'Food & Beverage': Star,
  Healthcare: Users,
  'Real Estate': HandshakeIcon,
  'Professional Services': ChartLine,
  Marine: Robot,
};
