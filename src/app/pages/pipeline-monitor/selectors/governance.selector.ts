import {
  latestControlObjectForPhase,
  latestRefineForPhase,
  refineEventsForReviewBlock,
} from '../../../lib/pipeline-governance';
import { PHASE_META } from '../phase-meta';
import type { PipelineStateLite } from '../types-pipeline-state';

export function getGovernanceSnapshot(state: PipelineStateLite | null, phaseId: number) {
  if (!state) return { controlObject: null, refine: null };
  return {
    controlObject: latestControlObjectForPhase(state.events, phaseId),
    refine: latestRefineForPhase(state.events, phaseId),
  };
}

export function getGovernanceRefinesForReviewModal(
  state: PipelineStateLite | null,
  afterPhase: number | null,
): Array<{ phase: number; phaseLabel: string; reasoning: string }> {
  if (!state?.events || afterPhase === null) return [];
  const events = refineEventsForReviewBlock(state.events, afterPhase);
  return events.map(event => ({
    phase: event.phase,
    phaseLabel: PHASE_META.find(phase => phase.id === event.phase)?.name ?? `Phase ${event.phase}`,
    reasoning:
      typeof (event.data as { reasoning?: string }).reasoning === 'string'
        ? (event.data as { reasoning: string }).reasoning
        : '',
  }));
}
