import { describe, expect, it } from 'vitest';

import { ORCHESTRATION_TELEMETRY_METRICS } from '../config/orchestration-telemetry-policy.js';

describe('orchestration LLM telemetry invariants (v9)', () => {
  it('exposes log-based metric keys for cache hit rate and per-call cost attribution', () => {
    expect(ORCHESTRATION_TELEMETRY_METRICS.llmCostPerAuditUsd).toMatch(/^kpi_orchestration_llm_cost/);
    expect(ORCHESTRATION_TELEMETRY_METRICS.llmCacheHitRate).toMatch(/^kpi_orchestration_llm_cache/);
  });
});
