import type { DomainKey } from '@glc/intake-core';

import {
  DIRECTOR_ORCHESTRATION_ADAPTER_REGISTRY,
  directorNumericScoresToOrchestrationWeighting,
  makePrefixedDirectorOrchestrationNodeId,
  ORCHESTRATION_NODE_SOURCE_DIRECTOR,
} from '../../config/director-orchestration-policy.js';
import {
  ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
  orchestrationNodeWeight,
} from '../../config/orchestration-graph-policy.js';
import type { OrchestrationGraphNodeAnalysisDepth } from '../../config/orchestration-graph-policy.js';
import { mapDirectorDomainToLane } from '../../config/orchestration-lanes.js';
import type { DirectorAction, DirectorWaveBundle } from '../../schemas/glc-director-orchestration-slice.js';
import type {
  OrchestrationActionNode,
  OrchestrationConflictResolvedEntry,
} from '../../types/orchestration/index.js';
import {
  normalizeDirectorConfidence,
  normalizeDirectorRisk,
} from './orchestration-action-normalizers.js';

export interface MapDirectorWaveBundleToNodesResult {
  nodes: OrchestrationActionNode[];
  conflicts_resolved: OrchestrationConflictResolvedEntry[];
}

function hasEvidenceShape(action: DirectorAction): boolean {
  if (!action.evidence) return false;
  const observed = action.evidence.observed?.length ?? 0;
  const derived = action.evidence.derived?.length ?? 0;
  const assumed = action.evidence.assumed?.length ?? 0;
  const missing = action.evidence.missing?.length ?? 0;
  return observed + derived + assumed + missing > 0;
}

function mapOneDirectorAction(args: {
  action: DirectorAction;
  domainKey: DomainKey;
  wave: OrchestrationGraphNodeAnalysisDepth;
}): OrchestrationActionNode {
  const { impact, effort, priority } = directorNumericScoresToOrchestrationWeighting({
    impact: args.action.impact,
    effort: args.action.effort,
    urgency: args.action.urgency,
  });
  const weight = orchestrationNodeWeight({ impact, effort, priority });
  const id = makePrefixedDirectorOrchestrationNodeId(args.domainKey, args.wave, args.action.id);
  const lane = mapDirectorDomainToLane(args.domainKey);
  const effortScore = args.action.effort;
  const dependencies = (args.action.dependencies ?? []).map(dep =>
    dep.includes(':') ? dep : makePrefixedDirectorOrchestrationNodeId(args.domainKey, args.wave, dep),
  );
  return {
    id,
    title: args.action.title,
    domain: args.domainKey,
    lane,
    dependencies,
    weight,
    source: ORCHESTRATION_NODE_SOURCE_DIRECTOR,
    analysis_depth: args.wave,
    confidence: normalizeDirectorConfidence(args.action.confidence),
    impact_score: args.action.impact,
    effort_score: effortScore,
    risk_score: normalizeDirectorRisk(args.action.risk),
    time_to_value: effortScore <= 2 ? 'fast' : effortScore >= 4 ? 'slow' : 'medium',
  };
}

export function mapDirectorWaveBundleToActionNodes(args: {
  domainKey: DomainKey;
  wave: OrchestrationGraphNodeAnalysisDepth;
  bundle: DirectorWaveBundle;
}): MapDirectorWaveBundleToNodesResult {
  const adapterId = DIRECTOR_ORCHESTRATION_ADAPTER_REGISTRY.default;
  const conflicts_resolved: OrchestrationConflictResolvedEntry[] = [];
  const seen = new Set<string>();
  const nodes: OrchestrationActionNode[] = [];

  for (const action of args.bundle.actions) {
    const id = makePrefixedDirectorOrchestrationNodeId(args.domainKey, args.wave, action.id);
    if (seen.has(id)) {
      conflicts_resolved.push({
        id: `director-dup:${id}`,
        summary: `Duplicate director action id "${action.id}" in ${args.domainKey}/${args.wave}; skipped by adapter ${adapterId}.`,
        resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
      });
      continue;
    }
    if (!hasEvidenceShape(action)) {
      conflicts_resolved.push({
        id: `director-evidence-missing:${id}`,
        summary: `Director action "${action.id}" in ${args.domainKey}/${args.wave} has no evidence taxonomy entries.`,
        resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
      });
    }
    const brokenDeps = (action.dependencies ?? []).filter(dep => dep.trim().length === 0);
    if (brokenDeps.length > 0) {
      conflicts_resolved.push({
        id: `director-broken-deps:${id}`,
        summary: `Director action "${action.id}" in ${args.domainKey}/${args.wave} has empty dependency references.`,
        resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
      });
    }
    seen.add(id);
    nodes.push(
      mapOneDirectorAction({
        action,
        domainKey: args.domainKey,
        wave: args.wave,
      }),
    );
  }

  return { nodes, conflicts_resolved };
}
