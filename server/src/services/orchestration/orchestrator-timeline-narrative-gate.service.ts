import { isOrchestrationRoadmapNarrativeEnabledForRequest } from '../../config/orchestration-rollout-gates.js';
import type { OrchestratorTimelineDto } from '../../schemas/orchestrator-timeline.js';

/**
 * Strips narrative-only fields when the caller is not entitled (mirrors SPA `getEffectiveOrchestrationRoadmapNarrativeEnabled`).
 * Deprecated `top_7d` / `top_30d` are always left intact for legacy consumers.
 */
export function redactOrchestratorTimelineNarrativeIfDisabled(
  timeline: OrchestratorTimelineDto,
  userEmail: string | null | undefined,
): OrchestratorTimelineDto {
  if (isOrchestrationRoadmapNarrativeEnabledForRequest(userEmail)) {
    return timeline;
  }
  return {
    ...timeline,
    milestones: undefined,
    top_priorities: undefined,
  };
}
