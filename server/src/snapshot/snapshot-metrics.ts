/**
 * In-process snapshot counters for operators (ADR observability). Not durable across restarts.
 * Merged on GET /api/snapshot/operator/metrics with cross-instance fields when `SNAPSHOT_SHARED_ABUSE_STORE` is on.
 */

type SnapshotOutcome = 'cache_hit' | 'fresh_completed' | 'degraded';

const counters = {
  runs_completed: 0,
  outcome_cache_hit: 0,
  outcome_fresh_completed: 0,
  outcome_degraded: 0,
  playwright_used: 0,
};

const fetchFailureByClass: Record<string, number> = {};
const ruleOutcome = { pass: 0, partial: 0, fail: 0 };

const LAT_MAX = 512;
const latenciesMs: number[] = [];

function pushLatency(ms: number): void {
  const n = Number.isFinite(ms) ? Math.max(0, Math.round(ms)) : 0;
  if (latenciesMs.length >= LAT_MAX) latenciesMs.shift();
  latenciesMs.push(n);
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  const idx = Math.min(sorted.length - 1, Math.ceil(p * sorted.length) - 1);
  return sorted[Math.max(0, idx)]!;
}

export function recordSnapshotRunMetrics(args: {
  outcome: SnapshotOutcome;
  duration_ms: number;
  cache_hit: boolean;
  playwright_used: boolean;
  home_fetch_failure: string | null;
  rule_results?: Array<{ status: 'pass' | 'partial' | 'fail' }>;
}): void {
  counters.runs_completed += 1;
  if (args.outcome === 'cache_hit') counters.outcome_cache_hit += 1;
  else if (args.outcome === 'fresh_completed') counters.outcome_fresh_completed += 1;
  else counters.outcome_degraded += 1;

  if (args.playwright_used) counters.playwright_used += 1;

  pushLatency(args.duration_ms);

  if (args.home_fetch_failure) {
    const k = args.home_fetch_failure;
    fetchFailureByClass[k] = (fetchFailureByClass[k] ?? 0) + 1;
  }

  if (args.rule_results?.length) {
    for (const r of args.rule_results) {
      if (r.status === 'pass') ruleOutcome.pass += 1;
      else if (r.status === 'partial') ruleOutcome.partial += 1;
      else ruleOutcome.fail += 1;
    }
  }
}

export function getSnapshotMetricsSnapshot(): {
  counters: typeof counters;
  fetch_failure_classes: Record<string, number>;
  rule_outcomes: typeof ruleOutcome;
  latency_ms: { samples: number; p50: number | null; p95: number | null };
} {
  const sorted = [...latenciesMs].sort((a, b) => a - b);
  return {
    counters: { ...counters },
    fetch_failure_classes: { ...fetchFailureByClass },
    rule_outcomes: { ...ruleOutcome },
    latency_ms: {
      samples: sorted.length,
      p50: percentile(sorted, 0.5),
      p95: percentile(sorted, 0.95),
    },
  };
}

/** Test helper */
export function resetSnapshotMetricsForTests(): void {
  counters.runs_completed = 0;
  counters.outcome_cache_hit = 0;
  counters.outcome_fresh_completed = 0;
  counters.outcome_degraded = 0;
  counters.playwright_used = 0;
  for (const k of Object.keys(fetchFailureByClass)) delete fetchFailureByClass[k];
  ruleOutcome.pass = 0;
  ruleOutcome.partial = 0;
  ruleOutcome.fail = 0;
  latenciesMs.length = 0;
}
