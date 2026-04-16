/**
 * Legacy UX label mapping for free snapshot UI.
 *
 * Historical behavior:
 * - legacy score 5 or 4 => "Good"
 * - legacy score 3 => "Moderate"
 * - legacy score 2 => "Needs Work"
 * - legacy score 1 or 0/other => "Critical"
 *
 * This is intentionally kept small and deterministic because it drives UI badges.
 */

export type SnapshotUxLegacyLabel = 'Good' | 'Moderate' | 'Needs Work' | 'Critical';

export const SNAPSHOT_UX_LEGACY_LABELS: ReadonlyArray<{
  minScore: number;
  label: SnapshotUxLegacyLabel;
}> = [
  { minScore: 4, label: 'Good' },
  { minScore: 3, label: 'Moderate' },
  { minScore: 2, label: 'Needs Work' },
] as const;

export const SNAPSHOT_UX_LEGACY_LABEL_FALLBACK: SnapshotUxLegacyLabel = 'Critical';

export function legacyUxLabelForScore(score: number): SnapshotUxLegacyLabel {
  const found = SNAPSHOT_UX_LEGACY_LABELS.find((r) => score >= r.minScore);
  return found?.label ?? SNAPSHOT_UX_LEGACY_LABEL_FALLBACK;
}

