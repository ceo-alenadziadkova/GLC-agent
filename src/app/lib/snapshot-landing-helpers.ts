import { SCORE_COLORS, SCORE_LABELS } from '@glc/intake-core';
import type { FreeSnapshotPreview, SnapshotCompetitorComparison, SnapshotSiteProfile } from '../data/auditTypes';
import {
  SNAPSHOT_LANDING_CATEGORY_HINTS,
  SNAPSHOT_LANDING_CLASSIFICATION_EXPLAINER,
  SNAPSHOT_LANDING_COMPETITOR_COPY,
  SNAPSHOT_LANDING_PHASE_LABELS,
  SNAPSHOT_LANDING_SCORE_EXPLAINER,
  SNAPSHOT_LANDING_SITE_PROFILE,
  type SnapshotCategoryScoreKey,
} from '../config/snapshot-landing-copy.en';

export type { SnapshotCategoryScoreKey };

export const SNAPSHOT_CATEGORY_BREAKDOWN_HINTS = SNAPSHOT_LANDING_CATEGORY_HINTS;

export { SCORE_COLORS, SCORE_LABELS };

export function competitorComparisonCaption(
  c: SnapshotCompetitorComparison,
  competitorLabel: string,
): { kind: 'client' | 'competitor' | 'tie'; text: string } {
  const C = SNAPSHOT_LANDING_COMPETITOR_COPY;
  if (c.metric === 'https') {
    if (c.winner === 'tie') return { kind: 'tie', text: C.https.tie };
    if (c.winner === 'client') return { kind: 'client', text: C.https.clientWins };
    return { kind: 'competitor', text: `${competitorLabel} ${C.https.competitorWinsSuffix}` };
  }
  if (c.metric === 'mobile_viewport') {
    if (c.winner === 'tie') return { kind: 'tie', text: C.mobile_viewport.tie };
    if (c.winner === 'client') return { kind: 'client', text: C.mobile_viewport.clientWins };
    return { kind: 'competitor', text: `${competitorLabel} ${C.mobile_viewport.competitorWinsSuffix}` };
  }
  if (c.metric === 'hreflang_count') {
    const cn = Number(c.client_val);
    const tn = Number(c.comp_val);
    if (c.winner === 'tie') return { kind: 'tie', text: C.hreflang_count.tie(cn) };
    if (c.winner === 'client') return { kind: 'client', text: C.hreflang_count.clientWins(cn, tn) };
    return { kind: 'competitor', text: C.hreflang_count.competitorWins(competitorLabel, tn, cn) };
  }
  if (c.metric === 'structured_data') {
    if (c.winner === 'tie') return { kind: 'tie', text: C.structured_data.tie };
    if (c.winner === 'client') return { kind: 'client', text: C.structured_data.clientWins };
    return { kind: 'competitor', text: `${competitorLabel} ${C.structured_data.competitorWinsSuffix}` };
  }
  return { kind: 'tie', text: c.label };
}

export const SEVERITY_COLOR: Record<string, string> = {
  critical: 'var(--score-1)',
  high: 'var(--score-2)',
  medium: 'var(--score-3)',
  low: 'var(--score-4)',
};

/** Phase labels for snapshot progress UI (mutable array for index access). */
export const PHASE_LABELS = [...SNAPSHOT_LANDING_PHASE_LABELS];

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
    return SNAPSHOT_LANDING_SCORE_EXPLAINER.whenHasOverall100;
  }
  const label = params.uxLabel?.trim() || SCORE_LABELS[params.band];
  const step = params.band;
  return SNAPSHOT_LANDING_SCORE_EXPLAINER.fivePointPrefix(step, label) + SNAPSHOT_LANDING_SCORE_EXPLAINER.fivePointSuffix;
}

export function siteProfileSoftLine(profile: SnapshotSiteProfile | undefined): string | null {
  if (!profile) return null;
  const low = profile.classificationConfidenceBand === 'low';
  const type = profile.siteType.replace(/-/g, ' ');
  const ind = profile.industry.replace(/-/g, ' ');
  const P = SNAPSHOT_LANDING_SITE_PROFILE;
  if (profile.industry !== 'unknown' && profile.siteType !== 'unknown') {
    return low ? P.lowConfidenceBoth(type, ind) : P.highConfidenceBoth(type, ind);
  }
  if (profile.siteType !== 'unknown') {
    return low ? P.lowConfidenceTypeOnly(type) : P.highConfidenceTypeOnly(type);
  }
  return P.unknown;
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
  const X = SNAPSHOT_LANDING_CLASSIFICATION_EXPLAINER;

  if (ct.tie_ambiguous && chosenLabel && runnerLabel) {
    parts.push(X.tieTwoLabels(chosenLabel, runnerLabel));
  } else if (ct.tie_ambiguous && chosenLabel) {
    parts.push(X.tieChosenOnly(chosenLabel));
  }

  if (band === 'low') {
    parts.push(X.lowConfidence);
  }

  if (parts.length === 0) return null;
  return parts.join(' ');
}
