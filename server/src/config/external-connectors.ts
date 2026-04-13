/**
 * External Connectors Registry — Phase 7+ multi-modal truth sources.
 *
 * Connectors provide external data enrichment to elevate claim verification
 * beyond what internal metrics and the user brief can supply.
 *
 * Truth Registry priority: external_api ranks above external_search (see truth-registry.ts).
 *
 * NON-BLOCKING CONTRACT (ADR-MULTIMODAL-TRUTH.md §3):
 *   - Every connector must implement its own internal timeout guard.
 *   - ConnectorRunner enforces a hard 3 s ceiling via Promise.race regardless.
 *   - fetch() must return null on any error or unavailability — never throw.
 *   - A connector failure can flag human_attention but must never block the pipeline.
 *
 * How to add a new connector:
 *   1. Implement ExternalConnector (or extend BaseExternalConnector).
 *   2. Add it to EXTERNAL_CONNECTORS with specific applicable_phases.
 *   3. Declare any required env vars in server/.env.example.
 *   4. Write a mock-based integration test (see connector-runner.test.ts pattern).
 *
 * Version history:
 *   v2.2 — Phase 7 / Sprint 3: initial file (infrastructure)
 *   v2.3 — Sprint 3: SecurityTxtWellKnownConnector (public, no API key)
 */

import type { DomainKey } from '../types/audit.js';
import { SecurityTxtWellKnownConnector } from '../connectors/security-txt-connector.js';

// ─── Input / Output shapes ────────────────────────────────────────────────────

export interface ConnectorFetchInput {
  /** Domain phase for which enrichment is being requested */
  phase_id: DomainKey;
  /**
   * High-risk fact types for this phase (from ExtendedPhaseProfile.high_risk_fact_types).
   * Connectors can use these to focus their external queries.
   */
  high_risk_fact_types: string[];
  /** Company URL being audited — for public data lookups (domain, technology, etc.) */
  company_url: string;
}

export interface ConnectorFetchOutput {
  /**
   * Which high-risk fact types the connector found supporting data for.
   * A claim whose type appears here can have its truth_source elevated to 'external_api'.
   */
  confirmed_fact_types: string[];
  /**
   * Human-readable notes about what was found (for CONTROL_OBJECT observability).
   * Not sent to Claude.
   */
  evidence_notes: string[];
}

// ─── Connector interface ──────────────────────────────────────────────────────

export interface ExternalConnector {
  /** Unique identifier (kebab-case). Referenced in ConnectorRunResult.connector_id. */
  readonly id: string;
  /** Human-readable display name. */
  readonly name: string;
  /**
   * Truth tier recorded in CONTROL_OBJECT when this connector succeeds.
   * Defaults to 'external_api' in ConnectorRunner.
   */
  readonly source_tier?: 'external_api' | 'document_feed';
  /**
   * Per-connector soft timeout (ms). ConnectorRunner enforces CONNECTOR_HARD_TIMEOUT_MS
   * as a ceiling and uses Math.min(connector.timeout_ms, CONNECTOR_HARD_TIMEOUT_MS).
   */
  readonly timeout_ms: number;
  /**
   * Domain phases this connector applies to.
   * - Non-empty array: connector only runs for listed phases.
   * - Empty array: connector applies to ALL phases (avoid — prefer explicit scoping).
   */
  readonly applicable_phases: DomainKey[];
  /**
   * Fetch external truth data for the given phase/domain context.
   *
   * MUST return null on any error, HTTP failure, or timeout — never throw.
   * ConnectorRunner wraps this in Promise.race; throwing wastes the race slot.
   */
  fetch(input: ConnectorFetchInput): Promise<ConnectorFetchOutput | null>;
}

// ─── Registry ─────────────────────────────────────────────────────────────────

/**
 * Registered external connectors.
 *
 * Add new entries only after: vetted API, rate-limit budget, non-blocking timeout tests,
 * and env documentation in server/.env.example where applicable.
 */
export const EXTERNAL_CONNECTORS: ExternalConnector[] = [new SecurityTxtWellKnownConnector()];

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns all connectors applicable to a given phase.
 * A connector with empty applicable_phases matches every phase.
 */
export function getConnectorsForPhase(phaseId: DomainKey): ExternalConnector[] {
  return EXTERNAL_CONNECTORS.filter(
    c => c.applicable_phases.length === 0 || c.applicable_phases.includes(phaseId),
  );
}
