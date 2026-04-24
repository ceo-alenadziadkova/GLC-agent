import type { StrategyInitiative } from '../../schemas/domain-output.js';
import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';

type ExplainProjection = {
  why?: string[];
  how?: { path_type?: string; description: string; time_estimate?: string };
  impact?: { score?: number; label?: string };
  time?: { bucket?: 'now' | 'next' | 'later'; target_window_days?: number; time_to_value?: string };
  risks?: string[];
  limited_context?: boolean;
};

const IMPACT_SCORE: Record<StrategyInitiative['impact'], number> = {
  high: 5,
  medium: 3,
  low: 2,
};

function normalizeTitle(input: string): string {
  return input.trim().toLowerCase();
}

function laneFallbackLabel(lane: GlcOrchestrationPack['graph']['nodes'][number]['lane']): string {
  return lane.replaceAll('_', ' ');
}

function mapInitiativesByNodeId(args: { pack: GlcOrchestrationPack; initiatives: StrategyInitiative[] }): Map<string, StrategyInitiative> {
  const byInitiativeId = new Map(args.initiatives.map((initiative) => [initiative.id, initiative] as const));
  const byNormalizedTitle = new Map(
    args.initiatives.map((initiative) => [normalizeTitle(initiative.title), initiative] as const),
  );
  const out = new Map<string, StrategyInitiative>();
  for (const node of args.pack.graph.nodes) {
    const byId = byInitiativeId.get(node.id);
    if (byId) {
      out.set(node.id, byId);
      continue;
    }
    const byTitle = byNormalizedTitle.get(normalizeTitle(node.title));
    if (byTitle) out.set(node.id, byTitle);
  }
  return out;
}

function buildDependencyHints(pack: GlcOrchestrationPack): Map<string, string[]> {
  const byNodeId = new Map<string, string[]>();
  const titleByNodeId = new Map(pack.graph.nodes.map((node) => [node.id, node.title] as const));
  for (const edge of pack.graph.edges) {
    const title = titleByNodeId.get(edge.to) ?? edge.to;
    const source = titleByNodeId.get(edge.from) ?? edge.from;
    const row = byNodeId.get(edge.to) ?? [];
    row.push(`${source} -> ${title} (${edge.relation})`);
    byNodeId.set(edge.to, row);
  }
  return byNodeId;
}

function buildInitiativeExplain(args: {
  initiative: StrategyInitiative;
  node: GlcOrchestrationPack['graph']['nodes'][number];
}): ExplainProjection {
  const primaryPath = args.initiative.execution_paths[0];
  return {
    why: args.initiative.decision.why_this,
    how: primaryPath
      ? {
          path_type: primaryPath.type,
          description: primaryPath.description,
          time_estimate: primaryPath.time_estimate,
        }
      : undefined,
    impact: {
      score: IMPACT_SCORE[args.initiative.impact],
      label: args.initiative.impact,
    },
    time: {
      bucket: args.node.time_bucket,
      target_window_days: args.node.target_window_days,
      time_to_value: args.initiative.outcome.timeframe,
    },
    risks: args.initiative.context.risks,
    limited_context: false,
  };
}

function buildFallbackExplain(args: {
  node: GlcOrchestrationPack['graph']['nodes'][number];
  dependencyHints: string[];
}): ExplainProjection {
  const hints = args.dependencyHints.slice(0, 2);
  return {
    why: [`Prioritized from ${laneFallbackLabel(args.node.lane)} lane orchestration context.`],
    how: {
      description:
        hints.length > 0
          ? `Dependency hints: ${hints.join('; ')}`
          : `No strategy initiative mapping found; using deterministic orchestration metadata.`,
    },
    impact: {
      label: 'limited-context',
    },
    time: {
      bucket: args.node.time_bucket,
      target_window_days: args.node.target_window_days,
    },
    risks: hints.length > 0 ? ['Dependency order may affect scope and sequencing.'] : undefined,
    limited_context: true,
  };
}

export function buildOrchestrationExplainProjection(args: {
  pack: GlcOrchestrationPack;
  initiatives: StrategyInitiative[];
  highlightedNodeIds?: Iterable<string>;
}): Map<string, ExplainProjection> {
  const initiativeByNodeId = mapInitiativesByNodeId(args);
  const dependencyHints = buildDependencyHints(args.pack);
  const highlighted = new Set(args.highlightedNodeIds ?? []);
  const out = new Map<string, ExplainProjection>();

  for (const node of args.pack.graph.nodes) {
    const matched = initiativeByNodeId.get(node.id);
    if (matched) {
      out.set(node.id, buildInitiativeExplain({ initiative: matched, node }));
      continue;
    }
    if (!highlighted.has(node.id)) continue;
    out.set(
      node.id,
      buildFallbackExplain({
        node,
        dependencyHints: dependencyHints.get(node.id) ?? [],
      }),
    );
  }
  return out;
}
