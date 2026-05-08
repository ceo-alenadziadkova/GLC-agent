import { operatorTriageReadinessTraceCodes, type IntakeReadinessEnvelope } from '@glc/intake-core';

/** Compact trace codes for support (filters progressive-certainty and per-signal boilerplate — see `@glc/intake-core` triage helpers). */
export function triageBlockingIntakeTraceCodes(envelope: IntakeReadinessEnvelope): string[] {
  return operatorTriageReadinessTraceCodes(envelope.trace);
}

export function buildPipelineIntakeReadinessBlockedDetails(envelope: IntakeReadinessEnvelope): {
  readiness: IntakeReadinessEnvelope;
  triage_blocking_trace_codes: string[];
} {
  return {
    readiness: envelope,
    triage_blocking_trace_codes: triageBlockingIntakeTraceCodes(envelope),
  };
}
