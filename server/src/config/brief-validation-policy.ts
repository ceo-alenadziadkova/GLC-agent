import { SYSTEM_DEFAULTS } from './system-defaults.js';

export const BRIEF_VALIDATION_POLICY = {
  progressWeights: {
    required: 3,
    recommended: 2,
    optional: 1,
    revenueSignal: 3,
  },
  preBriefSnapshotMinAnsweredRatio: 0.5,
  defaultCollectionMode: SYSTEM_DEFAULTS.intake.defaultBriefCollectionMode,
} as const;
