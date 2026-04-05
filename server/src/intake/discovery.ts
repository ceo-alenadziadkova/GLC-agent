/**
 * Mode C — docs/QUESTION_BANK.md § "Discovery — Mode C".
 * Subset of bank ids shown when `collectionMode === 'discovery'` (no-site / short path).
 */
export const DISCOVERY_BANK_IDS = new Set<string>([
  'a1',
  'a2',
  'a7',
  'a4',
  'a5',
  'a6',
  'd1',
  'd2',
  'd1a',
  'd1b',
  'c_nosite_1',
  'c_nosite_3',
  'c_nosite_2',
  'b2',
  'f8',
  'f1',
]);

export function isDiscoverySurfaceQuestion(id: string): boolean {
  return DISCOVERY_BANK_IDS.has(id);
}
