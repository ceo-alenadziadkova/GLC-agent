import type { GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import type { RoadmapManifestPayload } from '../../schemas/roadmap-manifest.js';
import { ORCHESTRATION_SYNTHESIS_CONTEXT_LIMITS } from '../../config/orchestration-synthesis-policy.js';

const L = ORCHESTRATION_SYNTHESIS_CONTEXT_LIMITS;

function truncateStr(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1)}…`;
}

function issueTitle(issue: unknown): string | null {
  if (!issue || typeof issue !== 'object') return null;
  const rec = issue as Record<string, unknown>;
  const title = rec.title;
  if (typeof title === 'string' && title.trim()) return truncateStr(title.trim(), L.maxIssueTitleLength);
  const text = rec.text;
  if (typeof text === 'string' && text.trim()) return truncateStr(text.trim(), L.maxIssueTitleLength);
  return null;
}

/**
 * Compact per-domain signals for orchestration synthesis (no full domain JSON).
 */
export function buildOrchestrationDomainSignals(
  domainRows: Array<Record<string, unknown>>,
): Array<{
  domain_key: string;
  score?: number;
  label?: string;
  issue_titles: string[];
}> {
  const out: Array<{
    domain_key: string;
    score?: number;
    label?: string;
    issue_titles: string[];
  }> = [];

  let n = 0;
  for (const row of domainRows) {
    if (n >= L.maxDomainRowsInContext) break;
    const domainKey = row.domain_key;
    if (typeof domainKey !== 'string' || !domainKey) continue;

    const titles: string[] = [];
    const issues = row.issues;
    if (Array.isArray(issues)) {
      for (const issue of issues) {
        if (titles.length >= L.maxIssuesPerDomain) break;
        const t = issueTitle(issue);
        if (t) titles.push(t);
      }
    }

    const score = typeof row.score === 'number' && Number.isFinite(row.score) ? row.score : undefined;
    const label =
      typeof row.label === 'string' ? truncateStr(row.label, L.maxDomainLabelChars) : undefined;

    out.push({ domain_key: domainKey, score, label, issue_titles: titles });
    n += 1;
  }
  return out;
}

export function buildOrchestrationSynthesisUserJson(args: {
  pack: GlcOrchestrationPack;
  normalizedStrategy: Record<string, unknown>;
  domainRows: Array<Record<string, unknown>>;
  /** Persisted roadmap manifest (same snapshot as pack.manifest_snapshot_id). */
  roadmapManifest?: RoadmapManifestPayload;
}): string {
  const scorecardRaw = args.normalizedStrategy.scorecard;
  const scorecard = Array.isArray(scorecardRaw) ? scorecardRaw : [];

  const overallScore =
    typeof args.normalizedStrategy.overall_score === 'number' &&
    Number.isFinite(args.normalizedStrategy.overall_score)
      ? args.normalizedStrategy.overall_score
      : null;

  const executiveExcerpt =
    typeof args.normalizedStrategy.executive_summary === 'string'
      ? truncateStr(args.normalizedStrategy.executive_summary, L.maxOrchestrationNotesChars)
      : undefined;

  const body: Record<string, unknown> = {
    deterministic_orchestration_pack: args.pack,
    strategy_scorecard: { overall_score: overallScore, rows: scorecard },
    domain_signals: buildOrchestrationDomainSignals(args.domainRows),
    executive_summary_excerpt: executiveExcerpt,
    ...(args.roadmapManifest
      ? {
          roadmap_input_manifest: {
            change_scenario: args.roadmapManifest.change_scenario,
            season_preset: args.roadmapManifest.season_preset,
            selected_domains: args.roadmapManifest.selected_domains,
            priority_weights: args.roadmapManifest.priority_weights ?? null,
          },
        }
      : {}),
  };

  let json = JSON.stringify(body);
  if (json.length <= L.maxUserJsonChars) {
    return json;
  }

  const summaryBody: Record<string, unknown> = {
    deterministic_orchestration_pack_summary: {
      version: args.pack.version,
      manifest_snapshot_id: args.pack.manifest_snapshot_id,
      critical_path: args.pack.critical_path,
      lanes: args.pack.lanes,
      graph_meta: args.pack.graph.meta ?? null,
      node_count: args.pack.graph.nodes.length,
      edge_count: args.pack.graph.edges.length,
      node_titles_by_id: Object.fromEntries(args.pack.graph.nodes.map((n) => [n.id, n.title])),
      edges: args.pack.graph.edges,
    },
    strategy_scorecard: body.strategy_scorecard,
    domain_signals: body.domain_signals,
    executive_summary_excerpt: body.executive_summary_excerpt,
    ...(typeof body.roadmap_input_manifest === 'object' && body.roadmap_input_manifest !== null
      ? { roadmap_input_manifest: body.roadmap_input_manifest }
      : {}),
    _note: 'full_pack_omitted_due_to_size_cap',
  };

  json = JSON.stringify(summaryBody);
  if (json.length <= L.maxUserJsonChars) {
    return json;
  }

  const minimal: Record<string, unknown> = {
    deterministic_orchestration_pack_summary: summaryBody.deterministic_orchestration_pack_summary,
    strategy_scorecard: { overall_score: (summaryBody.strategy_scorecard as { overall_score?: number | null }).overall_score ?? null, rows: [] },
    domain_signals: [],
    executive_summary_excerpt: summaryBody.executive_summary_excerpt,
    ...(typeof summaryBody.roadmap_input_manifest === 'object' && summaryBody.roadmap_input_manifest !== null
      ? { roadmap_input_manifest: summaryBody.roadmap_input_manifest }
      : {}),
    _note: 'payload_minimal_due_to_size_cap',
  };
  return JSON.stringify(minimal);
}
