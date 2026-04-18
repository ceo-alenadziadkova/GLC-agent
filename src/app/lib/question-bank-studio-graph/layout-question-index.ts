import layoutRulesArtifact from '@glc/intake-core/artifacts/layout-rules-1.1.0.json';
import type { LayoutRulesV1 } from '@glc/intake-core';
import { STUDIO_GRAPH_COPY_EN } from './studio-graph-copy.en';
import type { StudioLayoutSurfaceKey } from './types';

const LAYOUT_RULES = layoutRulesArtifact as LayoutRulesV1;

export function buildLayoutQuestionIndex(
  surface: StudioLayoutSurfaceKey,
): Map<string, { stepIndex: number; label: string }> {
  const steps = LAYOUT_RULES.surfaces[surface].steps;
  const map = new Map<string, { stepIndex: number; label: string }>();
  steps.forEach((step, stepIndex) => {
    const raw = step.label?.trim();
    const label = raw ? raw : STUDIO_GRAPH_COPY_EN.defaultStepLabel(stepIndex);
    for (const qid of step.questionIds) {
      if (!map.has(qid)) map.set(qid, { stepIndex, label });
    }
  });
  return map;
}
