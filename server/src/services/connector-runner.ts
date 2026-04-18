/**
 * ConnectorRunner — non-blocking external truth source enrichment.
 *
 * Runs all registered ExternalConnectors for a phase in parallel.
 * Each connector is race'd against a hard 3 s timeout. Failures, timeouts,
 * and errors all produce a safe ConnectorRunResult (never throw, never block).
 *
 * NON-BLOCKING CONTRACT (ADR-MULTIMODAL-TRUTH.md §3):
 *   - Connector calls never block the pipeline.
 *   - Timeout → timed_out: true, confirmed_fact_types: [].
 *   - HTTP error / throw → error: message, confirmed_fact_types: [].
 *   - The caller (base.ts) propagates results into buildControlObject():
 *       · confirmed claim types → elevate truth_source to 'external_api'.
 *       · all applicable connectors unavailable + high-risk claims present
 *         → add 'external_source_unavailable' to human_attention_required.
 *
 * When no connectors apply to a phase, runAll() returns [] with zero network calls.
 *
 * Version history:
 *   v2.2 — Phase 7 / Sprint 3: initial implementation
 */

import type { DomainKey } from '../types/audit.js';
import type { ExternalConnector, ConnectorFetchInput } from '../config/external-connectors.js';
import { getConnectorsForPhase } from '../config/external-connectors.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { logger } from './logger.js';

// ─── Hard timeout ─────────────────────────────────────────────────────────────

/**
 * Absolute ceiling for any single connector call (ms).
 * Overrides connector.timeout_ms if that value is higher.
 * Source: `SYSTEM_DEFAULTS.connectors.hardTimeoutMs` (ADR-MULTIMODAL-TRUTH.md §3).
 */
export const CONNECTOR_HARD_TIMEOUT_MS = SYSTEM_DEFAULTS.connectors.hardTimeoutMs;
export const CONNECTOR_DEGRADED_WARN_RATIO = SYSTEM_DEFAULTS.connectors.degradedWarnRatio;

// ─── Result shape ─────────────────────────────────────────────────────────────

export interface ConnectorRunResult {
  /** Connector id (from ExternalConnector.id) */
  connector_id: string;
  /**
   * Source tier tag for CONTROL_OBJECT truth_source elevation.
   * 'external_api' for API-based connectors; 'document_feed' for document connectors.
   */
  source_tier: 'external_api' | 'document_feed';
  /**
   * High-risk fact types this connector confirmed supporting data for.
   * Empty when timed_out or error is non-null.
   */
  confirmed_fact_types: string[];
  /** Observability notes (not sent to Claude). Empty on failure. */
  evidence_notes: string[];
  /** true = connector did not respond within timeout_ms */
  timed_out: boolean;
  /** Non-null = connector threw or returned a runtime error */
  error: string | null;
  /** Normalized connector execution outcome for observability and aggregate metrics. */
  outcome: 'success' | 'unavailable' | 'timed_out' | 'error';
}

// ─── ConnectorRunner ──────────────────────────────────────────────────────────

export class ConnectorRunner {
  /**
   * Runs all connectors applicable to `phaseId` in parallel.
   * Returns an array of results — one per connector.
   * Never throws; never blocks the pipeline.
   *
   * Returns [] immediately if no connectors are registered for the phase.
   */
  async runAll(
    phaseId: DomainKey,
    input: Omit<ConnectorFetchInput, 'phase_id'>,
  ): Promise<ConnectorRunResult[]> {
    const connectors = getConnectorsForPhase(phaseId);
    if (connectors.length === 0) return [];

    const settled = await Promise.allSettled(
      connectors.map(c => this.runOne(c, { ...input, phase_id: phaseId })),
    );

    const results = settled.map((outcome, i) => {
      if (outcome.status === 'fulfilled') return outcome.value;
      // runOne should never reject, but guard defensively
      logger.error('connector.unexpected_rejection', {
        component: 'connector',
        connector_id: connectors[i].id,
        reason: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
      });
      return {
        connector_id: connectors[i].id,
        source_tier: (connectors[i].source_tier ?? 'external_api') as 'external_api' | 'document_feed',
        confirmed_fact_types: [],
        evidence_notes: [],
        timed_out: false,
        error: outcome.reason instanceof Error ? outcome.reason.message : String(outcome.reason),
        outcome: 'error' as const,
      };
    });

    const summary = {
      success: 0,
      unavailable: 0,
      timed_out: 0,
      error: 0,
    };
    for (const r of results) {
      summary[r.outcome] += 1;
    }
    logger.info('connector.run_all_summary', {
      component: 'connector',
      phase_id: phaseId,
      total: results.length,
      ...summary,
    });

    const degradedRatio = (summary.timed_out + summary.error) / results.length;
    if (degradedRatio >= CONNECTOR_DEGRADED_WARN_RATIO) {
      logger.warn('connector.run_all_degraded', {
        component: 'connector',
        phase_id: phaseId,
        total: results.length,
        degraded_ratio: Number(degradedRatio.toFixed(4)),
        threshold: CONNECTOR_DEGRADED_WARN_RATIO,
        timed_out: summary.timed_out,
        error: summary.error,
      });
    }
    return results;
  }

  /** Run a single connector with hard timeout. Never rejects. */
  private async runOne(
    connector: ExternalConnector,
    input: ConnectorFetchInput,
  ): Promise<ConnectorRunResult> {
    const timeoutMs = Math.min(connector.timeout_ms, CONNECTOR_HARD_TIMEOUT_MS);
    const sourceTier = connector.source_tier ?? 'external_api';

    // Unique sentinel to distinguish timeout from connector fetch() returning null.
    const timeoutSentinel = Symbol('connector-timeout');
    const timeoutSignal = new Promise<typeof timeoutSentinel>(resolve =>
      setTimeout(() => resolve(timeoutSentinel), timeoutMs),
    );

    try {
      const outcome = await Promise.race([connector.fetch(input), timeoutSignal]);

      if (outcome === timeoutSentinel) {
        logger.info('connector.timed_out', {
          component: 'connector',
          connector_id: connector.id,
          phase_id: input.phase_id,
          timeout_ms: timeoutMs,
        });
        return {
          connector_id: connector.id,
          source_tier: sourceTier,
          confirmed_fact_types: [],
          evidence_notes: [],
          timed_out: true,
          error: null,
          outcome: 'timed_out',
        };
      }

      if (outcome === null) {
        logger.info('connector.unavailable', {
          component: 'connector',
          connector_id: connector.id,
          phase_id: input.phase_id,
        });
        return {
          connector_id: connector.id,
          source_tier: sourceTier,
          confirmed_fact_types: [],
          evidence_notes: [],
          timed_out: false,
          error: null,
          outcome: 'unavailable',
        };
      }

      logger.info('connector.success', {
        component: 'connector',
        connector_id: connector.id,
        phase_id: input.phase_id,
        confirmed_count: outcome.confirmed_fact_types.length,
      });

      return {
        connector_id: connector.id,
        source_tier: sourceTier,
        confirmed_fact_types: outcome.confirmed_fact_types,
        evidence_notes: outcome.evidence_notes,
        timed_out: false,
        error: null,
        outcome: 'success',
      };
    } catch (err) {
      logger.error('connector.fetch_error', {
        component: 'connector',
        connector_id: connector.id,
        phase_id: input.phase_id,
        error: err instanceof Error ? err.message : String(err),
      });
      return {
        connector_id: connector.id,
        source_tier: sourceTier,
        confirmed_fact_types: [],
        evidence_notes: [],
        timed_out: false,
        error: err instanceof Error ? err.message : String(err),
        outcome: 'error',
      };
    }
  }
}

// ─── Singleton ────────────────────────────────────────────────────────────────

export const connectorRunner = new ConnectorRunner();
