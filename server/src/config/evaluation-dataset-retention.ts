type RetentionPolicy = 'default' | 'extended' | 'internal_only';

export const EVALUATION_DATASET_RETENTION_TTL_DAYS: Record<RetentionPolicy, number> = {
  default: 90,
  extended: 365,
  internal_only: 365,
} as const;

export const EVALUATION_DATASET_RETENTION_DEFAULT: RetentionPolicy = 'default';
