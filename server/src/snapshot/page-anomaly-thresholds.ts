/**
 * Numeric thresholds for `page-anomaly` heuristics.
 * Source of truth: `SYSTEM_DEFAULTS.pageAnomaly`.
 */

import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

const P = SYSTEM_DEFAULTS.pageAnomaly;

export const PAGE_ANOMALY_SAMPLE_BYTES = P.sampleBytes;

export const PAGE_ANOMALY_REGISTRAR_THIN_VISIBLE_MAX = P.registrarThinVisibleMax;

export const PAGE_ANOMALY_OAUTH_RAW_MARKUP_MAX = P.oauthRawMarkupMax;

export const PAGE_ANOMALY_PASSWORD_RAW_MARKUP_MAX = P.passwordRawMarkupMax;

export const PAGE_ANOMALY_SPA_SHELL_VISIBLE_MAX = P.spaShellVisibleMax;

export const PAGE_ANOMALY_SPA_SHELL_SCRIPT_MIN = P.spaShellScriptMin;

export const PAGE_ANOMALY_SUPPRESS_ORG_VISIBLE_MIN = P.suppressOrgVisibleMin;

export const PAGE_ANOMALY_SUPPRESS_MAILTO_VISIBLE_MIN = P.suppressMailtoVisibleMin;

export const PAGE_ANOMALY_SUPPRESS_PATH_LINKS_HIGH = P.suppressPathLinksHigh;
export const PAGE_ANOMALY_SUPPRESS_PATH_LINKS_HIGH_VISIBLE_MIN = P.suppressPathLinksHighVisibleMin;

export const PAGE_ANOMALY_SUPPRESS_PATH_LINKS_MED = P.suppressPathLinksMed;
export const PAGE_ANOMALY_SUPPRESS_PATH_LINKS_MED_VISIBLE_MIN = P.suppressPathLinksMedVisibleMin;

export const PAGE_ANOMALY_SUPPRESS_LONG_COPY_VISIBLE_MIN = P.suppressLongCopyVisibleMin;
