/**
 * Canonical readiness badge thresholds (progress0–100). Single policy artifact for app + server defaults.
 */

export const INTAKE_READINESS_THRESHOLDS = {
  highMinInclusive: 80,
  mediumMinInclusive: 45,
} as const;
