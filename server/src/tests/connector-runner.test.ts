/**
 * ConnectorRunner unit tests — Phase 7 / Sprint 3
 *
 * Covers:
 *   - Empty registry: runAll returns [] with no network calls
 *   - Successful connector: confirmed_fact_types propagated, timed_out=false
 *   - Timeout: connector takes longer than timeout_ms → timed_out=true, confirmed=[]
 *   - Connector throws: error captured, pipeline unblocked (no throw)
 *   - Multiple connectors: results collected independently (one success, one fail)
 *   - CONNECTOR_HARD_TIMEOUT_MS constant value matches ADR spec (3000ms)
 *
 * FactChecker integration tests:
 *   - External enrichment elevates truth_source to 'external_api' for matching claims
 *   - All connectors failed + high-risk claims → external_source_unavailable flag
 *   - No connectors ran (empty results) → no external_source_unavailable flag
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Connector registry mock (must be hoisted) ────────────────────────────────

const mockConnectors: unknown[] = [];

vi.mock('../config/external-connectors.js', () => ({
  getConnectorsForPhase: vi.fn(() => mockConnectors),
}));

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

// Supabase is transitively required by fact-checker via agent-performance
vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(async () => ({ data: null, error: null })),
      maybeSingle: vi.fn(async () => ({ data: null, error: null })),
    })),
  },
}));

// ─── Imports after mocks ──────────────────────────────────────────────────────

import { ConnectorRunner, CONNECTOR_HARD_TIMEOUT_MS } from '../services/connector-runner.js';
import type { ExternalConnector } from '../config/external-connectors.js';
import { getConnectorsForPhase } from '../config/external-connectors.js';
import { FactChecker } from '../services/fact-checker.js';
import type { DomainResult } from '../types/audit.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PHASE = 'tech_infrastructure' as const;

const INPUT = {
  high_risk_fact_types: ['performance_claim', 'sla_claim'],
  company_url: 'https://example.com',
};

function makeConnector(
  id: string,
  fetchImpl: ExternalConnector['fetch'],
  overrides: Partial<ExternalConnector> = {},
): ExternalConnector {
  return {
    id,
    name: `Mock ${id}`,
    timeout_ms: 500,
    applicable_phases: [PHASE],
    fetch: fetchImpl,
    ...overrides,
  };
}

// ─── ConnectorRunner tests ────────────────────────────────────────────────────

describe('ConnectorRunner', () => {
  let runner: ConnectorRunner;

  beforeEach(() => {
    runner = new ConnectorRunner();
    mockConnectors.length = 0;
    vi.mocked(getConnectorsForPhase).mockImplementation(() => [...mockConnectors] as ExternalConnector[]);
  });

  it('returns [] immediately when no connectors are registered', async () => {
    const results = await runner.runAll(PHASE, INPUT);
    expect(results).toEqual([]);
  });

  it('propagates confirmed_fact_types and evidence_notes on success', async () => {
    mockConnectors.push(
      makeConnector('test-connector', async () => ({
        confirmed_fact_types: ['performance_claim'],
        evidence_notes: ['Found GTmetrix data'],
      })),
    );

    const results = await runner.runAll(PHASE, INPUT);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      connector_id: 'test-connector',
      source_tier: 'external_api',
      confirmed_fact_types: ['performance_claim'],
      evidence_notes: ['Found GTmetrix data'],
      timed_out: false,
      error: null,
    });
  });

  it('uses connector.source_tier document_feed in ConnectorRunResult', async () => {
    mockConnectors.push(
      makeConnector(
        'doc-connector',
        async () => ({
          confirmed_fact_types: [],
          evidence_notes: [],
        }),
        { source_tier: 'document_feed' },
      ),
    );

    const results = await runner.runAll(PHASE, INPUT);
    expect(results[0]?.source_tier).toBe('document_feed');
  });

  it('marks timed_out=true and returns empty confirmed when connector exceeds timeout', async () => {
    // Connector never resolves within the 100ms timeout
    mockConnectors.push(
      makeConnector(
        'slow-connector',
        () => new Promise(resolve => setTimeout(() => resolve({
          confirmed_fact_types: ['sla_claim'],
          evidence_notes: [],
        }), 10_000)),
        { timeout_ms: 100 },
      ),
    );

    const results = await runner.runAll(PHASE, INPUT);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      connector_id: 'slow-connector',
      timed_out: true,
      confirmed_fact_types: [],
      error: null,
    });
  }, 2_000); // test timeout: 2 s (the connector races to 100ms, not 10s)

  it('captures error message when connector throws', async () => {
    mockConnectors.push(
      makeConnector('throwing-connector', async () => {
        throw new Error('API key invalid');
      }),
    );

    const results = await runner.runAll(PHASE, INPUT);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      connector_id: 'throwing-connector',
      timed_out: false,
      confirmed_fact_types: [],
      error: 'API key invalid',
    });
  });

  it('captures result when connector returns null', async () => {
    mockConnectors.push(makeConnector('null-connector', async () => null));

    const results = await runner.runAll(PHASE, INPUT);

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      connector_id: 'null-connector',
      timed_out: true, // null return = treated as timeout signal
      confirmed_fact_types: [],
      error: null,
    });
  });

  it('collects results from multiple connectors independently', async () => {
    mockConnectors.push(
      makeConnector('ok-connector', async () => ({
        confirmed_fact_types: ['performance_claim'],
        evidence_notes: [],
      })),
      makeConnector('err-connector', async () => {
        throw new Error('Auth failed');
      }),
    );

    const results = await runner.runAll(PHASE, INPUT);

    expect(results).toHaveLength(2);
    const ok = results.find(r => r.connector_id === 'ok-connector')!;
    const err = results.find(r => r.connector_id === 'err-connector')!;

    expect(ok.confirmed_fact_types).toEqual(['performance_claim']);
    expect(ok.error).toBeNull();
    expect(err.confirmed_fact_types).toEqual([]);
    expect(err.error).toBe('Auth failed');
  });

  it('enforces CONNECTOR_HARD_TIMEOUT_MS ceiling even when connector.timeout_ms is higher', async () => {
    // Connector sets timeout_ms to 10 s, but hard cap is 3 s
    const connector = makeConnector(
      'overlong-connector',
      () => new Promise(resolve => setTimeout(() => resolve({
        confirmed_fact_types: [],
        evidence_notes: [],
      }), 10_000)),
      { timeout_ms: 10_000 },
    );
    mockConnectors.push(connector);

    const start = Date.now();
    const results = await runner.runAll(PHASE, INPUT);
    const elapsed = Date.now() - start;

    expect(results[0].timed_out).toBe(true);
    // Should have resolved at CONNECTOR_HARD_TIMEOUT_MS (3000ms), not at 10 000ms
    expect(elapsed).toBeLessThan(CONNECTOR_HARD_TIMEOUT_MS + 500);
  }, CONNECTOR_HARD_TIMEOUT_MS + 1_000);

  it('CONNECTOR_HARD_TIMEOUT_MS is 3000ms (matches ADR-MULTIMODAL-TRUTH.md §3)', () => {
    expect(CONNECTOR_HARD_TIMEOUT_MS).toBe(3_000);
  });
});

// ─── FactChecker integration tests ───────────────────────────────────────────

describe('FactChecker + ConnectorRunner enrichment', () => {
  const fc = new FactChecker();

  function baseResult(overrides: Partial<DomainResult> = {}): DomainResult {
    return {
      score: 3,
      label: 'Moderate',
      summary: 'OK',
      strengths: [],
      weaknesses: [],
      issues: [
        {
          id: '1',
          title: 'performance claim needs review',
          description: 'Page load time unverified',
          impact: 'Unknown performance posture',
          severity: 'medium',
          confidence: 'medium',
          data_source: 'inferred',
          evidence_refs: [{ type: 'synthetic_test', finding: 'connector-runner fixture' }],
        },
      ],
      recommendations: [],
      quick_wins: [],
      unknown_items: [],
      ...overrides,
    };
  }

  function buildVerification(result: DomainResult) {
    return fc.verify(result, 'tech_infrastructure', {});
  }

  it('elevates truth_source to external_api when connector confirms a matching fact type', () => {
    const verification = buildVerification(baseResult());
    const enrichments = [
      {
        connector_id: 'perf-api',
        source_tier: 'external_api' as const,
        confirmed_fact_types: ['performance_claim'],
        evidence_notes: [],
        timed_out: false,
        error: null,
      },
    ];

    const co = fc.buildControlObject(
      verification,
      'tech_infrastructure',
      'audit-1',
      1,
      'normal',
      {},
      {},
      enrichments,
    );

    // The issue title contains "performance claim" → should be elevated
    expect(co.trace.claim_sources[0].truth_source).toBe('external_api');
    expect(co.trace.claim_sources[0].truth_sources).toContain('external_search');
    expect(co.trace.claim_sources[0].truth_sources).toContain('external_api');
    expect(co.counts.statuses.confirmed_external).toBe(1);
  });

  it('does NOT elevate truth_source when confirmed types do not match issue title', () => {
    const verification = buildVerification(baseResult());
    const enrichments = [
      {
        connector_id: 'sla-api',
        source_tier: 'external_api' as const,
        confirmed_fact_types: ['sla_claim'], // no match for "performance claim" title
        evidence_notes: [],
        timed_out: false,
        error: null,
      },
    ];

    const co = fc.buildControlObject(
      verification,
      'tech_infrastructure',
      'audit-1',
      1,
      'normal',
      {},
      {},
      enrichments,
    );

    // Should NOT be elevated — original data_source='inferred' → 'external_search'
    expect(co.trace.claim_sources[0].truth_source).not.toBe('external_api');
    expect(co.trace.claim_sources[0].truth_sources).toEqual(['external_search']);
    expect(co.counts.statuses.confirmed_external).toBe(0);
  });

  it('adds external_source_unavailable when all connectors failed and high-risk claims exist', () => {
    const verification = buildVerification(baseResult());
    const enrichments = [
      {
        connector_id: 'perf-api',
        source_tier: 'external_api' as const,
        confirmed_fact_types: [],
        evidence_notes: [],
        timed_out: true,
        error: null,
      },
    ];

    const co = fc.buildControlObject(
      verification,
      'tech_infrastructure',
      'audit-1',
      1,
      'normal',
      {},
      {},
      enrichments,
    );

    expect(co.human_attention_required.required).toBe(true);
    expect(co.human_attention_required.reasons).toContain('external_source_unavailable');
  });

  it('does NOT add external_source_unavailable when connectors array is empty', () => {
    const verification = buildVerification(baseResult());

    const co = fc.buildControlObject(
      verification,
      'tech_infrastructure',
      'audit-1',
      1,
      'normal',
      {},
      {},
      [], // no connectors ran
    );

    expect(co.human_attention_required.reasons).not.toContain('external_source_unavailable');
  });

  it('does NOT add external_source_unavailable when at least one connector succeeded', () => {
    const verification = buildVerification(baseResult());
    const enrichments = [
      {
        connector_id: 'ok-connector',
        source_tier: 'external_api' as const,
        confirmed_fact_types: ['performance_claim'],
        evidence_notes: [],
        timed_out: false,
        error: null,
      },
    ];

    const co = fc.buildControlObject(
      verification,
      'tech_infrastructure',
      'audit-1',
      1,
      'normal',
      {},
      {},
      enrichments,
    );

    expect(co.human_attention_required.reasons).not.toContain('external_source_unavailable');
  });
});
