/**
 * Single source for audit domain labels, score scale, and report profile metadata.
 * English strings and i18n keys live in `ui-copy-registry.v1.json` (loaded via `ui-copy-registry.ts`).
 */

import type { DomainKey } from './audit-contract.js';
import {
  DOMAIN_DISPLAY_LABELS,
  REPORT_PROFILE_DESCRIPTIONS,
  REPORT_PROFILE_LABELS,
  REPORT_PROFILE_MARKDOWN_FOCUS_TITLE,
  REPORT_PROFILES,
  SCORE_COLORS,
  SCORE_LABELS,
  type ReportProfile,
} from './ui-copy-registry.js';
import { SCORE_BAND_THRESHOLDS_FROM_1_TO_5 } from './intake-policy-constants.js';

export type { ReportProfile };

export {
  DOMAIN_DISPLAY_LABELS,
  REPORT_PROFILE_DESCRIPTIONS,
  REPORT_PROFILE_LABELS,
  REPORT_PROFILE_MARKDOWN_FOCUS_TITLE,
  REPORT_PROFILES,
  SCORE_COLORS,
  SCORE_LABELS,
};

/** Human-readable domain name for API keys; falls back to the raw key. */
export function displayDomainLabel(key: string): string {
  return (DOMAIN_DISPLAY_LABELS as Record<string, string>)[key] ?? key;
}

/** Label for a 1–5 score (fractional scores rounded). */
export function scoreLabelFrom1To5(score: number): string {
  return SCORE_LABELS[Math.round(score)] ?? '';
}

/**
 * Color for a fractional 1–5 score (PDF / charts), using the discrete score palette.
 */
export function scoreBandColorFrom1To5(score: number): string {
  if (score >= SCORE_BAND_THRESHOLDS_FROM_1_TO_5.excellentMinInclusive) return SCORE_COLORS[5];
  if (score >= SCORE_BAND_THRESHOLDS_FROM_1_TO_5.goodMinInclusive) return SCORE_COLORS[4];
  if (score >= SCORE_BAND_THRESHOLDS_FROM_1_TO_5.moderateMinInclusive) return SCORE_COLORS[3];
  if (score >= SCORE_BAND_THRESHOLDS_FROM_1_TO_5.needsWorkMinInclusive) return SCORE_COLORS[2];
  return SCORE_COLORS[1];
}

/** Which domain keys are included per export profile (Markdown + PDF). */
export const REPORT_PROFILE_DOMAINS: Record<ReportProfile, DomainKey[] | 'all'> = {
  full: 'all',
  owner: 'all',
  tech: ['tech_infrastructure', 'security_compliance'],
  marketing: ['seo_digital', 'ux_conversion', 'marketing_utp'],
  onepager: 'all',
};
