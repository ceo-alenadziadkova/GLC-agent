export type IntakeSeedSourceRow = {
  url: string;
  industry: string | null;
  brief_snapshot: unknown;
};

/** Maps request row fields into intake brief seed payload. */
export function initialIntakeResponsesFromAuditRequest(row: IntakeSeedSourceRow): Record<string, unknown> {
  const snapshot =
    row.brief_snapshot && typeof row.brief_snapshot === 'object' && !Array.isArray(row.brief_snapshot)
      ? (row.brief_snapshot as Record<string, unknown>)
      : {};

  const out: Record<string, unknown> = {
    a11: { value: row.url, source: 'client' },
  };

  if (row.industry != null && String(row.industry).trim()) {
    out.a2 = { value: String(row.industry).trim(), source: 'client' };
  }

  const specify = snapshot.intake_industry_specify;
  if (typeof specify === 'string' && specify.trim()) {
    out.intake_industry_specify = { value: specify.trim(), source: 'client' };
  }

  return out;
}
