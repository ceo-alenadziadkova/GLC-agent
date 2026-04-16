import {
  INTAKE_WORDING_SCORING,
  resolveIntakeWordingScoringMode,
} from '../../../../config/intake-trace-wording-scoring';
import { INTAKE_TRACE_EDGE_GRAPH_COPY, formatWordingReviewTemplate } from '../../../../config/intake-trace-edge-graph-copy';
import type { WordingReviewItem, WordingScoringMode } from '../types';

interface BuildWordingReviewItemsInput {
  ids: string[];
  resolveCanonLabel: (id: string) => string;
  resolveDraftLabel: (id: string) => string | null;
  resolvePublishedLabel?: (id: string) => string | null;
  scoringMode: WordingScoringMode;
}

export function buildWordingReviewItems(input: BuildWordingReviewItemsInput): WordingReviewItem[] {
  const items: WordingReviewItem[] = [];
  const scoringVariant = resolveIntakeWordingScoringMode(input.scoringMode);
  const penaltyMultiplier = INTAKE_WORDING_SCORING.penaltyMultiplier[scoringVariant];
  const longThreshold = INTAKE_WORDING_SCORING.longThreshold[scoringVariant];
  const shortThreshold = INTAKE_WORDING_SCORING.shortThreshold[scoringVariant];
  const reviewCopy = INTAKE_TRACE_EDGE_GRAPH_COPY.wordingReview;

  for (const id of input.ids) {
    const canon = input.resolveCanonLabel(id).trim();
    const draft = input.resolveDraftLabel(id)?.trim() ?? '';
    const published = input.resolvePublishedLabel?.(id)?.trim() ?? '';
    const effective = (draft || published || canon).trim();
    const reasons: string[] = [];
    let penalty = 0;

    if (effective.length > longThreshold) {
      reasons.push(formatWordingReviewTemplate(reviewCopy.veryLongTemplate, { longThreshold }));
      penalty += INTAKE_WORDING_SCORING.penalties.longWording;
    }
    if (effective.length < shortThreshold) {
      reasons.push(formatWordingReviewTemplate(reviewCopy.tooShortTemplate, { shortThreshold }));
      penalty += INTAKE_WORDING_SCORING.penalties.shortWording;
    }
    if (/[/|]/.test(effective)) {
      reasons.push(reviewCopy.containsSeparators);
      penalty += INTAKE_WORDING_SCORING.penalties.separator;
    }
    if (/\b(other|misc|n\/a|na)\b/i.test(effective)) {
      reasons.push(reviewCopy.potentiallyVague);
      penalty += INTAKE_WORDING_SCORING.penalties.vagueWording;
    }
    if (!/[?]$/.test(effective)) {
      reasons.push(reviewCopy.missingQuestionMark);
      penalty += INTAKE_WORDING_SCORING.penalties.missingQuestionMark;
    }
    if (draft && draft === canon) {
      penalty += INTAKE_WORDING_SCORING.penalties.draftEqualsCanon;
    }

    const tunedPenalty = Math.round(penalty * penaltyMultiplier);
    const score = Math.max(
      INTAKE_WORDING_SCORING.score.min,
      Math.min(INTAKE_WORDING_SCORING.score.max, INTAKE_WORDING_SCORING.score.max - tunedPenalty),
    );

    if (reasons.length > 0) {
      items.push({
        id,
        severity: reasons.length >= INTAKE_WORDING_SCORING.severityHighReasonsMin ? 'high' : 'medium',
        reasons,
        score,
      });
    }
  }

  return items.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === 'high' ? -1 : 1;
    if (a.score !== b.score) return a.score - b.score;
    return a.id.localeCompare(b.id);
  });
}

export function filterVisibleWordingItems(items: WordingReviewItem[], highOnly: boolean): WordingReviewItem[] {
  return highOnly ? items.filter(item => item.severity === 'high') : items;
}

export function computeAverageWordingScore(items: WordingReviewItem[]): number {
  if (items.length === 0) return 100;
  const total = items.reduce((sum, item) => sum + item.score, 0);
  return Math.round((total / items.length) * 10) / 10;
}

