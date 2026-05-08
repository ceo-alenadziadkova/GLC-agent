import { GitBranch } from '@phosphor-icons/react';
import { DOMAIN_LABELS } from '../data/auditTypes';
import { COALITION_PROTOCOL_COPY } from '../config/coalition-protocol-copy.en';
import type { CoalitionAuditArtifacts } from '../data/audit/contracts/state/audit-state.types';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function asArray(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.map(asRecord).filter((item): item is Record<string, unknown> => item !== null)
    : [];
}

export function CoalitionChainView({ coalition }: { coalition: CoalitionAuditArtifacts | undefined }) {
  const copy = COALITION_PROTOCOL_COPY.chain;
  const rows = coalition?.hypothesis_drafts ?? [];
  if (rows.length === 0) {
    return (
      <section className="rounded-xl border bg-card p-4">
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-muted-foreground" aria-hidden />
          <h3 className="text-foreground text-sm font-semibold">{copy.title}</h3>
        </div>
        <p className="text-muted-foreground mt-2 text-xs">{copy.empty}</p>
      </section>
    );
  }

  const alignmentsByDomain = new Map(
    (coalition?.alignment_responses ?? []).map(row => [row.domain_key, asRecord(row.alignment)]),
  );

  return (
    <section className="rounded-xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2">
        <GitBranch className="h-4 w-4 text-info" aria-hidden />
        <h3 className="text-foreground text-sm font-semibold">{copy.title}</h3>
      </div>
      <div className="grid gap-3">
        {rows.map((row) => {
          const draft = asRecord(row.draft);
          const hypotheses = asArray(draft?.hypotheses);
          const corrections = asArray(alignmentsByDomain.get(row.domain_key)?.self_corrections);
          const label = DOMAIN_LABELS[row.domain_key as keyof typeof DOMAIN_LABELS] ?? row.domain_key;
          return (
            <div key={row.domain_key} className="rounded-lg border bg-background p-3">
              <p className="text-foreground text-xs font-semibold">{label}</p>
              <p className="text-muted-foreground mt-1 text-[length:var(--text-2xs)]">
                {hypotheses.length} {copy.hypotheses} · {corrections.length} {copy.corrections}
              </p>
              <div className="mt-2 space-y-1.5">
                {hypotheses.slice(0, 3).map((hypothesis) => (
                  <p key={String(hypothesis.id)} className="text-muted-foreground text-xs leading-relaxed">
                    <span className="font-mono text-[length:var(--text-2xs)]">{String(hypothesis.id)}</span>{' '}
                    {String(hypothesis.statement ?? '')}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
