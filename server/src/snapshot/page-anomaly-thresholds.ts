/**
 * Numeric thresholds for `page-anomaly` heuristics. Override via env for tuning without code edits.
 * All env vars are optional positive integers; invalid values fall back to defaults.
 */

function readPositiveInt(envName: string, fallback: number): number {
  const raw = process.env[envName]?.trim();
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

/** Max HTML bytes scanned for anomaly detection (default 96KB). */
export const PAGE_ANOMALY_SAMPLE_BYTES = readPositiveInt('SNAPSHOT_PAGE_ANOMALY_SAMPLE_BYTES', 96_000);

/** Registrar “weak parking” branch: visible text below this length counts as “thin”. */
export const PAGE_ANOMALY_REGISTRAR_THIN_VISIBLE_MAX = readPositiveInt(
  'SNAPSHOT_PAGE_ANOMALY_REGISTRAR_THIN_VISIBLE_MAX',
  3_800,
);

/** OAuth-style form gate: max raw markup length (lower = stricter). */
export const PAGE_ANOMALY_OAUTH_RAW_MARKUP_MAX = readPositiveInt('SNAPSHOT_PAGE_ANOMALY_OAUTH_RAW_MARKUP_MAX', 16_000);

/** Password-field thin page gate: max raw markup length. */
export const PAGE_ANOMALY_PASSWORD_RAW_MARKUP_MAX = readPositiveInt(
  'SNAPSHOT_PAGE_ANOMALY_PASSWORD_RAW_MARKUP_MAX',
  12_000,
);

/** SPA shell heuristic: visible text below this with many scripts suggests login wall. */
export const PAGE_ANOMALY_SPA_SHELL_VISIBLE_MAX = readPositiveInt('SNAPSHOT_PAGE_ANOMALY_SPA_SHELL_VISIBLE_MAX', 520);

/** SPA shell heuristic: minimum open script tags. */
export const PAGE_ANOMALY_SPA_SHELL_SCRIPT_MIN = readPositiveInt('SNAPSHOT_PAGE_ANOMALY_SPA_SHELL_SCRIPT_MIN', 10);

/** Weak parked suppression: min visible chars with Organization contact signal. */
export const PAGE_ANOMALY_SUPPRESS_ORG_VISIBLE_MIN = readPositiveInt('SNAPSHOT_PAGE_ANOMALY_SUPPRESS_ORG_VISIBLE_MIN', 350);

/** Weak parked suppression: min visible chars when mailto/tel present. */
export const PAGE_ANOMALY_SUPPRESS_MAILTO_VISIBLE_MIN = readPositiveInt(
  'SNAPSHOT_PAGE_ANOMALY_SUPPRESS_MAILTO_VISIBLE_MIN',
  650,
);

/** Weak parked suppression: internal path links threshold (high) with visible minimum. */
export const PAGE_ANOMALY_SUPPRESS_PATH_LINKS_HIGH = readPositiveInt('SNAPSHOT_PAGE_ANOMALY_SUPPRESS_PATH_LINKS_HIGH', 12);
export const PAGE_ANOMALY_SUPPRESS_PATH_LINKS_HIGH_VISIBLE_MIN = readPositiveInt(
  'SNAPSHOT_PAGE_ANOMALY_SUPPRESS_PATH_LINKS_HIGH_VISIBLE_MIN',
  550,
);

/** Weak parked suppression: internal path links threshold (medium) with visible minimum. */
export const PAGE_ANOMALY_SUPPRESS_PATH_LINKS_MED = readPositiveInt('SNAPSHOT_PAGE_ANOMALY_SUPPRESS_PATH_LINKS_MED', 8);
export const PAGE_ANOMALY_SUPPRESS_PATH_LINKS_MED_VISIBLE_MIN = readPositiveInt(
  'SNAPSHOT_PAGE_ANOMALY_SUPPRESS_PATH_LINKS_MED_VISIBLE_MIN',
  1_800,
);

/** Weak parked suppression: long copy alone is enough above this visible length. */
export const PAGE_ANOMALY_SUPPRESS_LONG_COPY_VISIBLE_MIN = readPositiveInt(
  'SNAPSHOT_PAGE_ANOMALY_SUPPRESS_LONG_COPY_VISIBLE_MIN',
  3_200,
);
