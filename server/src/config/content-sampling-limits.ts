/**
 * Cross-layer view of content sampling: collector caps vs report export slices.
 * Source of truth remains `SYSTEM_DEFAULTS.collectorsSampling` and `SYSTEM_DEFAULTS.reportProfiler`;
 * this module documents relationships for reviewers (no duplicate numbers).
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

export const COLLECTOR_SAMPLING_LIMITS = SYSTEM_DEFAULTS.collectorsSampling;

export const REPORT_PROFILER_AND_PDF_SLICE_LIMITS = SYSTEM_DEFAULTS.reportProfiler;
