/**
 * Parses `PIPELINE_INTAKE_READINESS_BLOCKED` **`details`** (from API) so the pipeline monitor can
 * list missing bank IDs the server already attaches to readiness trace rows.
 */

const MISSING_IDS_TRACE_CODES = new Set([
  'audit_blocked_full_sla',
  'audit_blocked_express_sla',
  'flow_blocked_express_required',
]);

export type IntakeBlockedTraceEntryLite = {
  code?: unknown;
  detail?: { missingRequiredIds?: unknown };
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

/** Ordered unique bank IDs referenced in SLA / flow gap trace rows. */
export function intakeReadinessMissingBankIdsFromEnvelopeDetails(details: unknown): string[] {
  if (!isRecord(details)) return [];
  const readiness = details.readiness;
  if (!isRecord(readiness)) return [];
  const trace = readiness.trace;
  if (!Array.isArray(trace)) return [];

  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of trace) {
    const entry = raw as IntakeBlockedTraceEntryLite;
    const code = entry.code;
    if (typeof code !== 'string' || !MISSING_IDS_TRACE_CODES.has(code)) continue;
    const missing = entry.detail?.missingRequiredIds;
    if (!Array.isArray(missing)) continue;
    for (const id of missing) {
      if (typeof id !== 'string' || seen.has(id)) continue;
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}
