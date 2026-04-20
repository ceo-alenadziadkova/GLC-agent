/**
 * Single entry point for final normalization of action nodes before graph construction.
 * All director/strategy merge outputs should pass through this pipeline (KISS/DRY).
 */
import { ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR } from '../../config/orchestration-graph-policy.js';
import { DIRECTOR_ORCHESTRATION_RISK_POLICY } from '../../config/director-orchestration-policy.js';
import type {
  OrchestrationActionNode,
  OrchestrationConflictResolvedEntry,
} from '../../types/orchestration/index.js';
import { normalizeDirectorRisk } from './orchestration-action-normalizers.js';

export interface NormalizeOrchestrationActionNodesPipelineResult {
  nodes: OrchestrationActionNode[];
  conflicts_resolved: OrchestrationConflictResolvedEntry[];
}

/**
 * - Dependency ids: trim, drop empty, unique, stable sort
 * - Risk: finite clamp via director risk policy
 * - Confidence: default to `medium` when missing (recorded)
 */
export function applyOrchestrationActionNodeNormalizationPipeline(
  nodes: OrchestrationActionNode[],
): NormalizeOrchestrationActionNodesPipelineResult {
  const conflicts_resolved: OrchestrationConflictResolvedEntry[] = [];
  const out: OrchestrationActionNode[] = [];

  for (const node of nodes) {
    const rawDeps = node.dependencies ?? [];
    const cleaned = rawDeps
      .map(d => d.trim())
      .filter(d => d.length > 0);
    const uniqueSorted = [...new Set(cleaned)].sort((x, y) => x.localeCompare(y));
    if (uniqueSorted.length !== rawDeps.length) {
      conflicts_resolved.push({
        id: `norm-deps:${node.id}`,
        summary: `Normalized dependencies for "${node.id}" (trim/dedupe/sort).`,
        resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
      });
    }

    let confidence = node.confidence;
    if (confidence === undefined) {
      confidence = 'medium';
      conflicts_resolved.push({
        id: `norm-confidence:${node.id}`,
        summary: `Missing confidence for "${node.id}"; defaulted to medium.`,
        resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
      });
    }

    const rawRisk = node.risk_score;
    const risk_score = normalizeDirectorRisk(
      typeof rawRisk === 'number' && Number.isFinite(rawRisk) ? rawRisk : Number.NaN,
    );
    if (rawRisk == null || !Number.isFinite(rawRisk)) {
      conflicts_resolved.push({
        id: `norm-risk:${node.id}`,
        summary: `Missing or non-finite risk for "${node.id}"; defaulted to ${DIRECTOR_ORCHESTRATION_RISK_POLICY.fallback}.`,
        resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
      });
    }

    out.push({
      ...node,
      dependencies: uniqueSorted,
      confidence,
      risk_score,
    });
  }

  return { nodes: out, conflicts_resolved };
}
