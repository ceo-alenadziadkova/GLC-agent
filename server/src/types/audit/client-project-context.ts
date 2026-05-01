import type { BriefResponseEntry, BriefResponseValue, IntakeVersionTuple } from '@glc/intake-core';

/**
 * Structured question-bank answers for the project (same cell shapes as `intake_brief.responses`).
 * Authoritative persistence remains `intake_brief` / public token row until a dedicated column exists.
 */
export type ClientProjectBankResponses = Record<string, BriefResponseValue | BriefResponseEntry | null>;

/**
 * Human-readable synthesis of what the business / project is (LLM snapshot, consultant edit, or both).
 */
export type ClientProjectNarrativeV1 = {
  text: string;
  /** ISO 8601 */
  updatedAt: string;
  /** How the narrative was last produced (for merge rules and UI). */
  source: 'client_confirmed' | 'llm_snapshot' | 'consultant' | 'system';
};

/**
 * Findings and signals attached after intake — keyed loosely so phases and collectors
 * can append without a migration per field. Treat as **enrichment**, not a second brief.
 */
export type ClientProjectAuditEnrichmentV1 = {
  /** e.g. lighthouse summary, recon highlights — version per producer as needed */
  byKey?: Record<string, unknown>;
};

export const CLIENT_PROJECT_CONTEXT_VERSION = 1 as const;

/**
 * Rolling **client project context**: one place to read “what this project is” and how
 * it grows from intake through audit. Composed from `intake_brief` + optional narrative
 * + optional post-intake signals — see ADR-CLIENT-PROJECT-CONTEXT-V1.
 */
export type ClientProjectContextV1 = {
  version: typeof CLIENT_PROJECT_CONTEXT_VERSION;
  /** Set when the engagement is linked to an audit. */
  auditId: string | null;
  /** Same tuple as stored on the brief when present (resolver compatibility). */
  intakeVersionTuple?: IntakeVersionTuple | null;
  /** Canonical structured answers from the question bank. */
  bankResponses: ClientProjectBankResponses;
  /** Short story of the project / company; optional until LLM snapshot or user fills it. */
  projectNarrative: ClientProjectNarrativeV1 | null;
  /** Grows as audit phases and collectors add signal (Lighthouse, domain outputs, etc.). */
  auditEnrichment: ClientProjectAuditEnrichmentV1;
  /** ISO 8601 — last time this **view** was assembled or persisted. */
  updatedAt: string;
};
