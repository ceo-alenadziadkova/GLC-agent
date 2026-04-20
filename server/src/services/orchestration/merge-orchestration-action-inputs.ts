import type { DomainKey } from '@glc/intake-core';

import {
  ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
  ORCHESTRATION_GRAPH_MAX_NODES,
  ORCHESTRATION_SOURCE_PRECEDENCE,
} from '../../config/orchestration-graph-policy.js';
import type { GlcDirectorOrchestrationSlice } from '../../schemas/glc-director-orchestration-slice.js';
import type { DirectorInputParseStatus } from './extract-glc-director-slice-from-raw-data.js';
import type {
  OrchestrationActionNode,
  OrchestrationConflictResolvedEntry,
  OrchestrationInputQuality,
} from '../../types/orchestration/index.js';

import { mapDirectorWaveBundleToActionNodes } from './map-domain-director-bundle-to-action-nodes.js';

export interface MergeOrchestrationActionInputsArgs {
  strategyNodes: OrchestrationActionNode[];
  slicesByDomain: ReadonlyMap<DomainKey, GlcDirectorOrchestrationSlice | null | undefined>;
  selectedDomains: readonly DomainKey[];
  inputStatusByDomain?: ReadonlyMap<DomainKey, DirectorInputParseStatus | undefined>;
}

export interface MergeOrchestrationActionInputsResult {
  nodes: OrchestrationActionNode[];
  conflicts_resolved: OrchestrationConflictResolvedEntry[];
  input_quality: OrchestrationInputQuality;
}

/**
 * Deterministic merge: strategy initiatives first, then director bundles per domain (sorted),
 * baseline wave before deep wave. Truncates to `ORCHESTRATION_GRAPH_MAX_NODES` with audit trail.
 */
export function mergeOrchestrationActionInputs(
  args: MergeOrchestrationActionInputsArgs,
): MergeOrchestrationActionInputsResult {
  const conflicts_resolved: OrchestrationConflictResolvedEntry[] = [];
  const directorChunks: OrchestrationActionNode[] = [];
  const domainsWithDirector = new Set<DomainKey>();
  const directorDependencyTargets = new Set<string>();

  const domains = [...args.selectedDomains].sort((a, b) => a.localeCompare(b));
  for (const domainKey of domains) {
    const slice = args.slicesByDomain.get(domainKey);
    if (!slice) continue;
    if (slice.baseline) {
      const b = mapDirectorWaveBundleToActionNodes({
        domainKey,
        wave: 'baseline',
        bundle: slice.baseline,
      });
      directorChunks.push(...b.nodes);
      conflicts_resolved.push(...b.conflicts_resolved);
      if (b.nodes.length > 0) domainsWithDirector.add(domainKey);
      for (const node of b.nodes) {
        for (const dep of node.dependencies ?? []) {
          directorDependencyTargets.add(dep);
        }
      }
    }
    if (slice.deep) {
      const d = mapDirectorWaveBundleToActionNodes({
        domainKey,
        wave: 'deep',
        bundle: slice.deep,
      });
      directorChunks.push(...d.nodes);
      conflicts_resolved.push(...d.conflicts_resolved);
      if (d.nodes.length > 0) domainsWithDirector.add(domainKey);
      for (const node of d.nodes) {
        for (const dep of node.dependencies ?? []) {
          directorDependencyTargets.add(dep);
        }
      }
    }
  }

  const strategyFallbackNodes = args.strategyNodes.filter(node => {
    const domain = node.domain as DomainKey;
    if (!domainsWithDirector.has(domain)) return true;
    if (!ORCHESTRATION_SOURCE_PRECEDENCE.retainStrategyDependencyAnchors) return false;
    return directorDependencyTargets.has(node.id);
  });
  const selectedSet = new Set<DomainKey>(args.selectedDomains);
  const strategyByDomain = new Map<DomainKey, number>();
  for (const node of args.strategyNodes) {
    const domain = node.domain as DomainKey;
    if (!selectedSet.has(domain)) continue;
    strategyByDomain.set(domain, (strategyByDomain.get(domain) ?? 0) + 1);
  }
  for (const domain of [...selectedSet].sort((a, b) => a.localeCompare(b))) {
    if ((strategyByDomain.get(domain) ?? 0) === 0) continue;
    if (domainsWithDirector.has(domain)) continue;
    conflicts_resolved.push({
      id: `director-fallback:${domain}`,
      summary: `Director slice missing for "${domain}"; strategy nodes kept as fallback.`,
      resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
    });
  }
  if (args.strategyNodes.length !== strategyFallbackNodes.length) {
    conflicts_resolved.push({
      id: 'strategy-replaced-by-director',
      summary: `Action precedence ${ORCHESTRATION_SOURCE_PRECEDENCE.canonical.join(' > ')} applied for covered domains; only dependency-anchored strategy nodes are retained.`,
      resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
    });
  }

  const combined = [...strategyFallbackNodes, ...directorChunks];
  const selectedDomainCount = Math.max(1, selectedSet.size);
  const directorCoverageRatio = Math.min(1, domainsWithDirector.size / selectedDomainCount);
  const parseStatusByDomain = args.inputStatusByDomain ?? new Map<DomainKey, DirectorInputParseStatus | undefined>();
  let domainsWithValidDirectorInput = 0;
  let domainsWithInvalidDirectorInput = 0;
  for (const domain of selectedSet) {
    const status = parseStatusByDomain.get(domain);
    if (status === 'valid') domainsWithValidDirectorInput += 1;
    if (status === 'invalid') domainsWithInvalidDirectorInput += 1;
  }
  const directorInputCoverageRatio = Math.min(1, domainsWithValidDirectorInput / selectedDomainCount);
  const hasAnyDirectorCoverage = domainsWithDirector.size > 0;
  const hasFallbackDomains = domainsWithDirector.size < selectedSet.size;
  const input_quality: OrchestrationInputQuality = {
    input_mode: hasAnyDirectorCoverage ? 'director_enriched' : 'strategy_fallback',
    director_coverage_ratio: directorCoverageRatio,
    director_input_coverage_ratio: directorInputCoverageRatio,
    degraded: !hasAnyDirectorCoverage || hasFallbackDomains,
    fallback_reason_code:
      domainsWithInvalidDirectorInput > 0
        ? 'director_slice_invalid'
        : !hasAnyDirectorCoverage
          ? 'director_slice_missing'
          : hasFallbackDomains
            ? 'director_slice_partial'
            : undefined,
  };

  if (combined.length <= ORCHESTRATION_GRAPH_MAX_NODES) {
    return { nodes: combined, conflicts_resolved, input_quality };
  }

  const kept = combined.slice(0, ORCHESTRATION_GRAPH_MAX_NODES);
  for (let i = ORCHESTRATION_GRAPH_MAX_NODES; i < combined.length; i += 1) {
    const n = combined[i]!;
    conflicts_resolved.push({
      id: `merge-cap-drop:${n.id}:idx${i}`,
      summary: `Node "${n.id}" excluded: merged list exceeds ORCHESTRATION_GRAPH_MAX_NODES (${ORCHESTRATION_GRAPH_MAX_NODES}).`,
      resolution: ORCHESTRATION_CONFLICT_RESOLUTION_FOR_GRAPH_REPAIR,
    });
  }
  return { nodes: kept, conflicts_resolved, input_quality };
}
