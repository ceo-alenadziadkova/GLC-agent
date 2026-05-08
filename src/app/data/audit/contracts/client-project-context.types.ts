import type { BriefResponseEntry, BriefResponseValue, IntakeVersionTuple } from '@glc/intake-core';

/**
 * @see server/src/types/audit/client-project-context.ts (keep in sync)
 */

export type ClientProjectBankResponses = Record<string, BriefResponseValue | BriefResponseEntry | null>;

export type ClientProjectNarrativeV1 = {
  text: string;
  updatedAt: string;
  source: 'client_confirmed' | 'llm_snapshot' | 'consultant' | 'system';
};

export type ClientProjectAuditEnrichmentV1 = {
  byKey?: Record<string, unknown>;
};

export const CLIENT_PROJECT_CONTEXT_VERSION = 1 as const;

export type ClientProjectContextV1 = {
  version: typeof CLIENT_PROJECT_CONTEXT_VERSION;
  auditId: string | null;
  intakeVersionTuple?: IntakeVersionTuple | null;
  bankResponses: ClientProjectBankResponses;
  projectNarrative: ClientProjectNarrativeV1 | null;
  auditEnrichment: ClientProjectAuditEnrichmentV1;
  updatedAt: string;
};
