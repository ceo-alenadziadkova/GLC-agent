import type { GlcOrchestrationPackView } from '../data/audit/contracts/report/orchestration-pack.types';
import { orchestrationNodeTitleMap, prioritizeCrossLaneEdges } from './orchestration-timeline-projection';

function escapeDotLabel(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, ' ');
}

/**
 * Minimal Graphviz DOT digraph for an orchestration pack (client export).
 * Node ids are anonymized (n0, n1, …) to avoid DOT identifier issues; labels carry initiative titles.
 */
export function buildOrchestrationPackDotExport(
  pack: GlcOrchestrationPackView,
  opts: { maxEdges: number },
): string {
  const titleMap = orchestrationNodeTitleMap(pack);
  const edges = prioritizeCrossLaneEdges(pack).slice(0, Math.max(0, opts.maxEdges));
  const idToN = new Map<string, string>();
  let i = 0;
  const assign = (id: string) => {
    if (!idToN.has(id)) {
      idToN.set(id, `n${i++}`);
    }
  };
  for (const e of edges) {
    assign(e.from);
    assign(e.to);
  }
  for (const id of pack.critical_path) {
    assign(id);
  }
  const lines: string[] = ['digraph glc_orchestration {', '  rankdir=LR;'];
  for (const [realId, nid] of idToN) {
    const label = titleMap.get(realId) ?? realId;
    lines.push(`  ${nid} [label="${escapeDotLabel(label)}"];`);
  }
  for (const e of edges) {
    const a = idToN.get(e.from);
    const b = idToN.get(e.to);
    if (a && b) {
      lines.push(`  ${a} -> ${b};`);
    }
  }
  lines.push('}');
  return lines.join('\n');
}
