/**
 * Report profile slice sizes — source: `SYSTEM_DEFAULTS.reportProfiler`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const P = SYSTEM_DEFAULTS.reportProfiler;
const PDF = SYSTEM_DEFAULTS.reportPdf;

export const REPORT_PROFILER_OWNER_TOP_ISSUES_MAX = P.ownerTopIssuesMax;

export const REPORT_PROFILER_OWNER_TOP_RECS_MAX = P.ownerTopRecsMax;

export const REPORT_PROFILER_ONEPAGER_TOP_ISSUES_MAX = P.onepagerTopIssuesMax;

export const REPORT_PROFILER_ONEPAGER_TOP_QUICK_WINS_MAX = P.onepagerTopQuickWinsMax;

export const REPORT_PDF_DOMAIN_ISSUES_MAX = P.pdfDomainIssuesMax;

export const REPORT_PDF_DOMAIN_QUICK_WINS_MAX = P.pdfDomainQuickWinsMax;

export const REPORT_PDF_RENDER_TIMEOUT_MS = PDF.renderTimeoutMs;

export const REPORT_PDF_RENDER_CONCURRENCY = PDF.renderConcurrency;

export const REPORT_PDF_MAX_OUTPUT_BYTES = PDF.maxOutputBytes;

export const REPORT_PDF_MAX_SANITIZED_TEXT_CHARS = PDF.maxSanitizedTextChars;
