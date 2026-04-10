/**
 * Mode C — docs/QUESTION_BANK.md § "Discovery — Mode C".
 * Subset of bank ids for `collectionMode === 'discovery'` (no-site / short path).
 *
 * Single source of truth: `intake-policy.v1.json` → `modes.discovery.included`.
 * Philosophy and exclusions are documented there and in QUESTION_BANK.md.
 */
import { INTAKE_POLICY_V1 } from './core/load-policy.js';

export const DISCOVERY_BANK_IDS = new Set<string>(INTAKE_POLICY_V1.modes.discovery.included);

export function isDiscoverySurfaceQuestion(id: string): boolean {
  return DISCOVERY_BANK_IDS.has(id);
}
