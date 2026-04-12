/**
 * Collector output sampling caps — source: `SYSTEM_DEFAULTS.collectorsSampling`.
 */

import { SYSTEM_DEFAULTS } from './system-defaults.js';

const S = SYSTEM_DEFAULTS.collectorsSampling;

export const COLLECTOR_CRAWLER_CONTACT_FIELD_MAX = S.crawlerContactFieldMax;

export const COLLECTOR_MARKETING_BLOG_PAGE_SAMPLES = S.marketingBlogPageSamples;

export const COLLECTOR_ACCESSIBILITY_AUDIT_URLS_MAX = S.accessibilityAuditUrlsMax;

export const COLLECTOR_AXE_PLAYWRIGHT_URLS_MAX = S.axePlaywrightUrlsMax;

export const COLLECTOR_AXE_VIOLATION_ID_SAMPLE_MAX = S.axeViolationIdSampleMax;

export const COLLECTOR_UX_SAMPLE_H1S_MAX = S.uxSampleH1sMax;

export const COLLECTOR_UX_SAMPLE_CTAS_MAX = S.uxSampleCtasMax;

export const POST_AUDIT_FOLLOWUPS_MAX = S.postAuditFollowupsMax;
