/**
 * Shared heuristics: tech stack → analytics guess, industry normalization, business-activity blurbs.
 * Used by free-snapshot upgrade and new-audit site pre-scrape prefill.
 */
import { INDUSTRY_OPTIONS } from '../config/industry-options.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { UPGRADE_FREE_SNAPSHOT_CONTEXT_EN } from '../config/upgrade-free-snapshot-context.js';

const UFP = SYSTEM_DEFAULTS.upgradeFreeSnapshotPrefill;
const UFCTX = UPGRADE_FREE_SNAPSHOT_CONTEXT_EN;

export function flattenTechStack(tech: Record<string, string[]> | null | undefined): string[] {
  if (!tech || typeof tech !== 'object') return [];
  return Object.values(tech)
    .flat()
    .map(s => String(s).trim())
    .filter(Boolean);
}

export function detectAnalyticsFromTech(tech: Record<string, string[]> | null | undefined): boolean {
  const blob = flattenTechStack(tech).join(' ').toLowerCase();
  return UFCTX.analyticsDetectionSubstrings.some(sub => blob.includes(sub));
}

export function nearestIndustry(label: string | null | undefined): { industry: string; specify: string | null } {
  const raw = (label ?? '').trim();
  if (!raw) return { industry: 'Other', specify: null };
  const lower = raw.toLowerCase();
  const exact = INDUSTRY_OPTIONS.find(i => i.toLowerCase() === lower);
  if (exact) return { industry: exact, specify: null };
  const partial = INDUSTRY_OPTIONS.find(
    i => i !== 'Other' && (lower.includes(i.toLowerCase()) || i.toLowerCase().includes(lower)),
  );
  if (partial) return { industry: partial, specify: null };
  return { industry: 'Other', specify: raw.slice(0, UFP.industrySpecifyMaxChars) };
}

export function hostFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return (
      url.replace(/^https?:\/\//, '').split('/')[0]?.replace(/^www\./, '') ?? UFCTX.hostFallbackLabel
    );
  }
}

function humanizeConversionModel(id: unknown): string {
  const s = String(id ?? '').trim();
  if (!s) return '';
  const map = UFCTX.conversionModelHumanize as Record<string, string>;
  return map[s] ?? '';
}

export function mapConversionToRevenueModel(id: unknown): string | null {
  const s = String(id ?? '').trim();
  if (!s) return null;
  const map = UFCTX.revenueModelLabelByConversionModel as Record<string, string>;
  return map[s] ?? null;
}

export function mapAudienceGuess(ag: unknown): string | null {
  const s = String(ag ?? '').trim().toLowerCase();
  if (!s) return null;
  const lines = UFCTX.audienceGuessLines as Record<string, string>;
  return lines[s] ?? null;
}

export function buildBusinessActivityContext(args: {
  siteProfile: Record<string, unknown> | undefined | null;
  uxRowSummary: string | null | undefined;
}): {
  blurb: string;
  primaryOffer: string;
  shortLabel: string;
  conversionHuman: string;
} {
  const primaryOffer = String(args.siteProfile?.primaryOffer ?? '').trim();
  const shortLabel = String(args.siteProfile?.shortLabel ?? '').trim();
  const conversionHuman = humanizeConversionModel(args.siteProfile?.conversionModel);
  const ux = (args.uxRowSummary ?? '').trim();

  const parts: string[] = [];
  if (shortLabel) parts.push(`Site profile: ${shortLabel}.`);
  if (primaryOffer) {
    parts.push(`Primary offer from public pages: ${primaryOffer}.`);
  }
  if (conversionHuman) parts.push(`The site emphasises ${conversionHuman}.`);
  if (ux) {
    parts.push(
      ux.length > UFP.uxRowSummarySoftMaxChars
        ? `${ux.slice(0, UFP.uxRowSummarySliceChars)}…`
        : ux,
    );
  }

  const blurb = parts.join(' ').trim().slice(0, UFP.businessActivityBlurbMaxChars);
  return { blurb, primaryOffer, shortLabel, conversionHuman };
}
