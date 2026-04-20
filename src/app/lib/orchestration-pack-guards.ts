import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import { DOMAIN_KEYS } from '../data/auditTypes';
import { ORCHESTRATION_LANE_LABELS } from '../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_INPUT_GATE_STATUSES } from '../config/orchestration-contract';

const domainSet = new Set<string>(DOMAIN_KEYS);
const laneKeys = Object.keys(ORCHESTRATION_LANE_LABELS);
const laneSet = new Set<string>(laneKeys);
const sourceSet = new Set(['strategy', 'director']);
const analysisDepthSet = new Set(['baseline', 'deep']);
const relationSet = new Set(['direct_blocker', 'strong', 'medium', 'weak']);
const inputGateSet = new Set<string>(ORCHESTRATION_INPUT_GATE_STATUSES);

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

export function isGlcOrchestrationPackView(raw: unknown): raw is GlcOrchestrationPackView {
  if (!isObjectRecord(raw)) return false;
  const candidate = raw as Partial<GlcOrchestrationPackView>;
  if (typeof candidate.version !== 'number') return false;
  if (!Array.isArray(candidate.critical_path)) return false;
  if (!isObjectRecord(candidate.graph)) return false;
  if (!Array.isArray(candidate.graph.nodes) || !Array.isArray(candidate.graph.edges)) return false;
  if (!isObjectRecord(candidate.lanes)) return false;
  if (Object.keys(candidate.lanes).some((lane) => !laneSet.has(lane))) return false;
  if (Object.values(candidate.lanes).some((nodes) => !Array.isArray(nodes) || nodes.some((id) => typeof id !== 'string'))) {
    return false;
  }

  const nodesValid = candidate.graph.nodes.every((node) => {
    if (!isObjectRecord(node)) return false;
    if (typeof node.id !== 'string' || typeof node.title !== 'string') return false;
    if (typeof node.domain !== 'string' || !domainSet.has(node.domain)) return false;
    if (typeof node.lane !== 'string' || !laneSet.has(node.lane)) return false;
    if (node.source !== undefined && (typeof node.source !== 'string' || !sourceSet.has(node.source))) return false;
    if (
      node.analysis_depth !== undefined &&
      (typeof node.analysis_depth !== 'string' || !analysisDepthSet.has(node.analysis_depth))
    ) {
      return false;
    }
    return true;
  });
  if (!nodesValid) return false;

  const edgesValid = candidate.graph.edges.every((edge) => {
    if (!isObjectRecord(edge)) return false;
    if (typeof edge.from !== 'string' || typeof edge.to !== 'string') return false;
    if (edge.relation !== undefined && (typeof edge.relation !== 'string' || !relationSet.has(edge.relation))) {
      return false;
    }
    return true;
  });
  if (!edgesValid) return false;

  if (candidate.input_quality) {
    if (!isObjectRecord(candidate.input_quality)) return false;
    const gateStatus = candidate.input_quality.input_gate_status;
    if (typeof gateStatus !== 'string' || !inputGateSet.has(gateStatus)) return false;
  }

  return true;
}
