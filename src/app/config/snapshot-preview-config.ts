export const SNAPSHOT_PREVIEW_SUMMARY_MAX_CHARS = 280;

export const SNAPSHOT_PREVIEW_LEGACY_UX_LABELS = {
  goodMinScore: 4,
  moderateMinScore: 3,
  needsWorkMinScore: 2,
  labels: {
    good: 'Good',
    moderate: 'Moderate',
    needsWork: 'Needs Work',
    critical: 'Critical',
  },
} as const;

export const SNAPSHOT_PREVIEW_LEGACY_SCORE_THRESHOLDS = {
  score5MinOverall: 81,
  score4MinOverall: 61,
  score3MinOverall: 41,
  score2MinOverall: 21,
} as const;
