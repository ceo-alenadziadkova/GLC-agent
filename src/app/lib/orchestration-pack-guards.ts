import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';

export function isGlcOrchestrationPackView(raw: unknown): raw is GlcOrchestrationPackView {
  if (!raw || typeof raw !== 'object') return false;
  const candidate = raw as Partial<GlcOrchestrationPackView>;
  if (typeof candidate.version !== 'number') return false;
  if (!Array.isArray(candidate.critical_path)) return false;
  if (!candidate.graph || typeof candidate.graph !== 'object') return false;
  if (!Array.isArray(candidate.graph.nodes) || !Array.isArray(candidate.graph.edges)) return false;
  if (!candidate.lanes || typeof candidate.lanes !== 'object') return false;
  return true;
}
