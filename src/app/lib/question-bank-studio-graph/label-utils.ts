import { getPolicyOverlayForQuestion } from '../question-bank-studio-policy';
import { STUDIO_GRAPH_COPY_EN } from './studio-graph-copy.en';
import { STUDIO_GRAPH_LABEL_TRUNCATE } from './studio-graph-layout.config';

export function truncateStudioGraphLabel(
  s: string,
  max: number = STUDIO_GRAPH_LABEL_TRUNCATE.questionDefault,
): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function studioPolicyBadgeList(
  overlay: ReturnType<typeof getPolicyOverlayForQuestion>,
): string[] {
  const b: string[] = [];
  if (overlay.syntheticRequired) b.push(STUDIO_GRAPH_COPY_EN.policyBadgeSyntheticRequired);
  if (overlay.requiredAlways) b.push(STUDIO_GRAPH_COPY_EN.policyBadgeRequiredAlways);
  if (overlay.requiredIfVisible) b.push(STUDIO_GRAPH_COPY_EN.policyBadgeRequiredIfVisible);
  if (overlay.policyRequirednessNone) b.push(STUDIO_GRAPH_COPY_EN.policyBadgeRequirednessNone);
  return b;
}
