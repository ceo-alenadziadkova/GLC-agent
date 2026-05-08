import type { LighthouseAuditSummary } from '../../lib/lighthouse-audit.js';

/** Exact f2 option strings from `question-bank.v1.json` (audit focus areas). */
const F2_PERF =
  'Website performance and technology (speed, stability, technical health)' as const;
const F2_SEO = 'Online visibility and SEO (finding and attracting the right traffic)' as const;
const F2_CX = 'Customer experience and conversions (turning visitors into customers)' as const;

export type LighthouseBankPrefillHintsV1 = {
  /** f2 `multi_select` option labels suggested from scores (user still confirms in UI). */
  f2_suggested_options: string[];
  /** f3 `single_select` option label, when derivable. */
  f3_suggested_option: string | null;
  /** Short English reasons per suggestion (for UI tooltips / logs). */
  reasons: string[];
};

/**
 * Heuristic map from a Lighthouse summary to known bank field shapes (f2 / f3).
 * No LLM; conservative thresholds. Used for `recon_prefills` hints only, not as submitted answers.
 */
export function buildLighthouseBankPrefillHints(lh: LighthouseAuditSummary): LighthouseBankPrefillHintsV1 {
  const f2: string[] = [];
  const reasons: string[] = [];
  if (lh.performance_score != null && lh.performance_score < 55) {
    f2.push(F2_PERF);
    reasons.push(`Performance score ${lh.performance_score}/100`);
  }
  if (lh.seo_score != null && lh.seo_score < 55) {
    f2.push(F2_SEO);
    reasons.push(`SEO score ${lh.seo_score}/100`);
  }
  if (lh.accessibility_score != null && lh.accessibility_score < 50) {
    f2.push(F2_CX);
    reasons.push(`Accessibility score ${lh.accessibility_score}/100`);
  }
  const seen = new Set<string>();
  const f2_suggested_options = f2.filter(o => (seen.has(o) ? false : (seen.add(o), true)));

  const scores = [lh.performance_score, lh.seo_score, lh.accessibility_score, lh.best_practices_score].filter(
    (n): n is number => n != null && Number.isFinite(n),
  );
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null;
  let f3_suggested_option: string | null = null;
  if (avg != null) {
    if (avg < 40) f3_suggested_option = '1 — Struggling';
    else if (avg < 55) f3_suggested_option = '2';
    else if (avg < 70) f3_suggested_option = '3 — Okay-ish';
    else if (avg < 85) f3_suggested_option = '4';
    else f3_suggested_option = '5 — Nailing it';
  }

  return { f2_suggested_options, f3_suggested_option, reasons };
}

export function buildLighthouseBootstrapSummaryLine(lh: LighthouseAuditSummary): string {
  const parts: string[] = [];
  if (lh.performance_score != null) parts.push(`Performance ${lh.performance_score}/100`);
  if (lh.seo_score != null) parts.push(`SEO ${lh.seo_score}/100`);
  if (lh.accessibility_score != null) parts.push(`Accessibility ${lh.accessibility_score}/100`);
  if (lh.best_practices_score != null) parts.push(`Best practices ${lh.best_practices_score}/100`);
  if (parts.length === 0) return '';
  return `Initial Lighthouse snapshot: ${parts.join(', ')}.`;
}
