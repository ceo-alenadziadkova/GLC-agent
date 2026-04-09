import type { FreeSnapshotPreview, SnapshotCompetitorComparison, SnapshotSiteProfile } from '../data/auditTypes';

export type SnapshotCategoryScoreKey =
  | 'ux_clarity'
  | 'conversion_readiness'
  | 'ai_readiness'
  | 'technical_basics';

export const SNAPSHOT_CATEGORY_BREAKDOWN_HINTS: Record<SnapshotCategoryScoreKey, string> = {
  ux_clarity:
    'How clear the first screen is for someone who has never seen your brand: what you do, who it is for, primary navigation, trust signals, how easy contact is to find, and basic language/accessibility markers. The score is the share of automated UX checks that passed on the HTML we fetched (0–100)—a thin sample, not a full UX review.',
  conversion_readiness:
    'How easy it is to take the next step: strength of the main call-to-action, form labels and friction, whether pricing or commerce paths are discoverable, competing buttons in the hero, reassurance near actions, FAQs, and simple risk reducers. The number is the portion of those checks that passed in this snapshot (0–100), based only on pages we could load.',
  ai_readiness:
    'How much structured, machine-readable context we found—mainly JSON-LD (Organization, WebSite, products, offers, FAQ, breadcrumbs, etc.) that our rules expect. Higher means more of those checks passed on the sampled markup. It is not a promise about rankings or citations inside any specific AI product.',
  technical_basics:
    'Baseline technical signals in our grab: page title, viewport meta, HTTPS/canonical hints, whether the page looks indexable, Open Graph basics, informative alt text on images, and breadth of structured data. The score is the share of those checks that passed (0–100); it is not a penetration test or performance audit.',
};

export const SCORE_COLORS: Record<number, string> = {
  1: '#EF4444',
  2: '#F97316',
  3: '#EAB308',
  4: '#22C55E',
  5: '#0ECF82',
};

export const SCORE_LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'Needs Work',
  3: 'Moderate',
  4: 'Good',
  5: 'Excellent',
};

export function competitorComparisonCaption(
  c: SnapshotCompetitorComparison,
  competitorLabel: string,
): { kind: 'client' | 'competitor' | 'tie'; text: string } {
  if (c.metric === 'https') {
    if (c.winner === 'tie') return { kind: 'tie', text: 'Both sites use HTTPS' };
    if (c.winner === 'client') return { kind: 'client', text: 'HTTPS is in use on your site' };
    return { kind: 'competitor', text: `${competitorLabel} uses HTTPS; check your redirect` };
  }
  if (c.metric === 'mobile_viewport') {
    if (c.winner === 'tie') return { kind: 'tie', text: 'Both include a mobile viewport meta tag' };
    if (c.winner === 'client') return { kind: 'client', text: 'Your homepage declares a mobile viewport' };
    return { kind: 'competitor', text: `${competitorLabel} declares a mobile viewport — yours may not` };
  }
  if (c.metric === 'hreflang_count') {
    const cn = Number(c.client_val);
    const tn = Number(c.comp_val);
    if (c.winner === 'tie') return { kind: 'tie', text: `Both expose ${cn} hreflang alternate(s)` };
    if (c.winner === 'client') return { kind: 'client', text: `You show more hreflang alternates (${cn} vs ${tn})` };
    return { kind: 'competitor', text: `${competitorLabel} shows more hreflang alternates (${tn} vs ${cn})` };
  }
  if (c.metric === 'structured_data') {
    if (c.winner === 'tie') return { kind: 'tie', text: 'Both homepages include JSON-LD structured data' };
    if (c.winner === 'client') return { kind: 'client', text: 'Your homepage includes JSON-LD structured data' };
    return { kind: 'competitor', text: `${competitorLabel} includes JSON-LD — yours may not` };
  }
  return { kind: 'tie', text: c.label };
}

export const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--score-1)',
  high: 'var(--score-2)',
  medium: 'var(--score-3)',
  low: 'var(--score-4)',
};

export const PHASE_LABELS = [
  'Scanning homepage...',
  'Detecting tech & structure...',
  'Running rule-based checks...',
  'Building your snapshot...',
];

export function scoreColorFrom100(n: number): string {
  if (n >= 80) return SCORE_COLORS[5];
  if (n >= 60) return SCORE_COLORS[4];
  if (n >= 40) return SCORE_COLORS[3];
  if (n >= 20) return SCORE_COLORS[2];
  return SCORE_COLORS[1];
}

/** Companion 1–5 band from the API (maps alongside 0–100); internal name kept for readability. */
export function legacyUxBand(uxScore: number | null | undefined): keyof typeof SCORE_COLORS {
  if (uxScore != null && uxScore >= 1 && uxScore <= 5) return uxScore;
  return 3;
}

/** Ring fill 0–100 for SVG only; matches overall score. */
export function donutFillFromOverall(overall: number): number {
  return Math.max(0, Math.min(100, overall));
}

/** Ring fill for 1–5-only display — proportional visual only, not a second score metric. */
export function donutFillFromLegacyBand(band: keyof typeof SCORE_COLORS): number {
  return Math.max(0, Math.min(100, (Number(band) / 5) * 100));
}

/** User-facing copy for the score explainer (1–5 path when 0–100 is not shown). */
export function fivePointBandExplanation(params: {
  band: keyof typeof SCORE_COLORS;
  uxLabel: string | null | undefined;
  hasOverall100: boolean;
}): string {
  if (params.hasOverall100) {
    return 'The score out of 100 sums every rule we ran on the pages we could fetch in this snapshot—not a separate audit.';
  }
  const label = params.uxLabel?.trim() || SCORE_LABELS[params.band];
  const step = params.band;
  return (
    `This ${step}/5 result (${label}) uses that same five-point band (1 = Critical … 5 = Excellent). ` +
    'It reflects rule-based checks on the pages we could access—not a full consulting review.'
  );
}

export function siteProfileSoftLine(profile: SnapshotSiteProfile | undefined): string | null {
  if (!profile) return null;
  const low = profile.classificationConfidenceBand === 'low';
  const type = profile.siteType.replace(/-/g, ' ');
  const ind = profile.industry.replace(/-/g, ' ');
  if (profile.industry !== 'unknown' && profile.siteType !== 'unknown') {
    return low
      ? `Signals suggest something like a ${type} in ${ind} — automatic read only, not a final label.`
      : `This looks like a ${type} in ${ind} (automatic read from your pages).`;
  }
  if (profile.siteType !== 'unknown') {
    return low
      ? `Signals suggest a ${type}-style site — we could not pin down a specific industry automatically.`
      : `This looks like a ${type}-style site based on visible signals.`;
  }
  return 'We could not confidently categorise this site from the sampled pages alone.';
}

function humanizeSiteTypeLabel(id: string | null | undefined): string | null {
  if (!id || id === 'unknown') return null;
  return id.replace(/-/g, ' ');
}

function runnerUpSiteTypeLabel(
  result: FreeSnapshotPreview,
  ct: NonNullable<FreeSnapshotPreview['classification_transparency']>,
): string | null {
  const chosen = result.site_profile?.siteType;
  let rid: string | null | undefined = ct.runner_up_site_type ?? undefined;
  if (!rid || rid === 'unknown' || rid === chosen) {
    const sec = ct.score_top_two[1];
    rid = sec?.[0];
  }
  if (!rid || rid === 'unknown' || rid === chosen) return null;
  return humanizeSiteTypeLabel(rid);
}

/**
 * One-line explainability when the free snapshot classified the site with low confidence or a near-tie.
 * Uses API `classification_transparency`; returns null when the server did not send it or no message applies.
 */
export function snapshotClassificationExplainerLine(result: FreeSnapshotPreview): string | null {
  const ct = result.classification_transparency;
  if (!ct) return null;

  const band =
    result.classification_confidence_band ?? result.site_profile?.classificationConfidenceBand ?? null;
  const show = ct.tie_ambiguous === true || band === 'low';
  if (!show) return null;

  const chosenLabel = humanizeSiteTypeLabel(result.site_profile?.siteType);
  const runnerLabel = runnerUpSiteTypeLabel(result, ct);

  const parts: string[] = [];

  if (ct.tie_ambiguous && chosenLabel && runnerLabel) {
    parts.push(
      `Our quick scan scored "${chosenLabel}" and "${runnerLabel}" about the same—treat this as a rough hint, not a final industry label.`,
    );
  } else if (ct.tie_ambiguous && chosenLabel) {
    parts.push(
      `More than one site pattern matched closely on the pages we could load—we show "${chosenLabel}" as the closest fit.`,
    );
  }

  if (band === 'low') {
    parts.push(
      'Confidence is low because we only sampled a few pages; a full audit can use more of your site and brief context.',
    );
  }

  if (parts.length === 0) return null;
  return parts.join(' ');
}
