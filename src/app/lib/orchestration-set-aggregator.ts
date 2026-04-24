import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';

export type SetAggregatorResult = {
  effortRange: { minDays: number; maxDays: number } | null;
  expectedImpact: 'low' | 'medium' | 'high' | 'unknown';
  keyRisks: string[];
  minConfidence: 'high' | 'medium' | 'low' | 'unknown';
  confidenceDistribution: Record<'high' | 'medium' | 'low', number>;
};

const CONF_ORDER = { high: 3, medium: 2, low: 1 } as const;

function minConfRank(
  a: 'high' | 'medium' | 'low' | 'unknown',
): number {
  if (a === 'unknown') return 0;
  return CONF_ORDER[a];
}

/**
 * Derives a set-level summary for the selected action ids and current pack (pure; no I/O).
 */
export function buildOrchestrationSetAggregator(
  selectedActionIds: string[],
  pack: GlcOrchestrationPackView,
): SetAggregatorResult {
  const idSet = new Set(selectedActionIds);
  const nodes = pack.graph.nodes.filter(n => idSet.has(n.id));
  if (nodes.length === 0) {
    return {
      effortRange: null,
      expectedImpact: 'unknown',
      keyRisks: [],
      minConfidence: 'unknown',
      confidenceDistribution: { high: 0, medium: 0, low: 0 },
    };
  }

  const days = nodes
    .map(n => n.target_window_days)
    .filter((d): d is number => typeof d === 'number' && d > 0);
  const effortRange =
    days.length === 0 ? null : { minDays: Math.min(...days), maxDays: Math.max(...days) };

  const scores = nodes
    .map(n => n.priority_score)
    .filter((s): s is number => typeof s === 'number' && s > 0);
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
  let expectedImpact: SetAggregatorResult['expectedImpact'] = 'unknown';
  if (avg > 0) {
    if (avg >= 0.66) expectedImpact = 'high';
    else if (avg >= 0.33) expectedImpact = 'medium';
    else expectedImpact = 'low';
  }

  const riskN = (name: string, v: number | undefined) =>
    v != null && v >= 4 ? `Elevated risk: ${name}` : null;
  const keyRisks: string[] = [];
  for (const n of nodes) {
    const r = pack.risk_layer?.node_risk?.[n.id];
    const line = riskN(n.title, r);
    if (line) keyRisks.push(line);
  }
  if (keyRisks.length > 3) keyRisks.length = 3;

  const confMap = pack.confidence_map?.node_confidence ?? {};
  const distribution: Record<'high' | 'medium' | 'low', number> = { high: 0, medium: 0, low: 0 };
  let minConf: 'high' | 'medium' | 'low' | 'unknown' = 'unknown';
  for (const n of nodes) {
    const c = confMap[n.id] ?? 'medium';
    if (c === 'high' || c === 'medium' || c === 'low') {
      distribution[c] += 1;
      if (minConf === 'unknown' || minConfRank(c) < minConfRank(minConf)) {
        minConf = c;
      }
    }
  }

  return { effortRange, expectedImpact, keyRisks, minConfidence: minConf, confidenceDistribution: distribution };
}
