/**
 * Cross-lane **narrative** copy for high-weight graph edges. Keys are `laneA|laneB` pairs; they are
 * not the same as `orchestration-lane-registry` (sort/priority only).
 * When product adds a lane, extend `ORCHESTRATION_LANE_PAIR_NARRATIVE_REGISTRY` for relevant pairs
 * and update lane labels in `orchestration-roadmap-ui-copy.en.ts`.
 */
import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import type { OrchestrationLaneId } from '../config/orchestration-roadmap-ui-copy.en';
import { ORCHESTRATION_LANE_LABELS } from '../config/orchestration-roadmap-ui-copy.en';

const WEIGHT_THRESHOLD = 0.7;

function nodeLane(pack: GlcOrchestrationPackView, nodeId: string): OrchestrationLaneId | undefined {
  return pack.graph.nodes.find(n => n.id === nodeId)?.lane;
}

function pairKey(a: OrchestrationLaneId, b: OrchestrationLaneId): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Cross-lane edges that look like strong “blocking” influence (pack graph), highest weight first. */
export function selectTopCrossLaneBlockingEdges(
  pack: GlcOrchestrationPackView,
  maxPairs: number,
): Array<{ from: string; to: string; line: string }> {
  const out: Array<{ from: string; to: string; line: string; weight: number }> = [];
  for (const e of pack.graph.edges) {
    const fromLane = nodeLane(pack, e.from);
    const toLane = nodeLane(pack, e.to);
    if (!fromLane || !toLane || fromLane === toLane) continue;
    const w = e.weight ?? 0;
    if (w < WEIGHT_THRESHOLD) continue;
    const rel = e.relation ?? 'medium';
    if (rel !== 'strong' && rel !== 'direct_blocker' && rel !== 'medium') continue;
    const k = pairKey(fromLane, toLane);
    const line = ORCHESTRATION_LANE_PAIR_NARRATIVE_REGISTRY[k] ?? ORCHESTRATION_LANE_PAIR_NARRATIVE_REGISTRY.__default;
    out.push({ from: e.from, to: e.to, line, weight: w });
  }
  out.sort((a, b) => b.weight - a.weight);
  const seen = new Set<string>();
  const deduped: Array<{ from: string; to: string; line: string }> = [];
  for (const row of out) {
    const id = pairKey(nodeLane(pack, row.from)!, nodeLane(pack, row.to)!);
    if (seen.has(id)) continue;
    seen.add(id);
    deduped.push({ from: row.from, to: row.to, line: row.line });
    if (deduped.length >= maxPairs) break;
  }
  return deduped;
}

/**
 * Curated copy for lane-pair narratives (V7). Extend as product adds pairs.
 * Keys are sorted `laneA|laneB` with `OrchestrationLaneId` lexicographic order.
 */
export const ORCHESTRATION_LANE_PAIR_NARRATIVE_REGISTRY: Record<string, string> = {
  __default:
    'These lanes depend on each other before you can commit dates—align owners and sequencing across the handoff.',
  [`marketing_narrative|processes_automation`]:
    'Marketing promises and automation throughput must move together: confirm the delivery and ops cadence before scaling campaigns.',
  [`marketing_narrative|tech_delivery`]:
    'Growth and delivery are linked here: stabilize the release path before pushing campaign volume that depends on the same surface area.',
  [`processes_automation|tech_delivery`]:
    'Automation and platform changes are coupled—sequence migrations and playbooks so operations are not left behind the tech cutover.',
  [`risk_compliance|tech_delivery`]:
    'Compliance and infrastructure trade-offs are explicit: resolve security gates in parallel with release windows, not as an afterthought.',
  [`marketing_narrative|seo`]:
    'Search and narrative programs share discovery surfaces: align measurement and messaging before splitting budgets across channels.',
  [`gtm_sales|marketing_narrative`]:
    'GTM and campaigns must hand off cleanly: lock ICP, message, and pipeline stages before you scale spend across channels.',
  [`gtm_sales|product_change`]:
    'Revenue motion and what ships in-product are coupled—sequence packaging, proof, and release windows as one thread.',
  [`gtm_sales|tech_delivery`]:
    'Sales tooling and platform delivery are linked: don’t open demand without the surfaces and data paths that can convert it.',
  [`product_change|research`]:
    'Product bets and research threads must hand off: lock what is validated (and what is not) before you expand build scope.',
  [`gtm_sales|research`]:
    'GTM and validation work share proof: know what the market signal is before you scale pipeline or message spend.',
};

export function formatLanePairHeadline(
  pack: GlcOrchestrationPackView,
  from: string,
  to: string,
): string {
  const a = nodeLane(pack, from);
  const b = nodeLane(pack, to);
  if (!a || !b) return 'Cross-lane';
  return `${ORCHESTRATION_LANE_LABELS[a]} → ${ORCHESTRATION_LANE_LABELS[b]}`;
}
