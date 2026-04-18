import type { AuditDomain } from '../data/audit';

interface ExecutiveSummaryProps {
  domain: AuditDomain;
}

export function ExecutiveSummary({ domain }: ExecutiveSummaryProps) {
  return (
    <section className="mb-12">
      <div className="mb-3">
        <div className="mb-2 text-xs font-semibold tracking-wide text-[var(--text-tertiary)]">
          EXECUTIVE SUMMARY
        </div>
        <h2 className="text-2xl font-semibold text-[var(--text-primary)]">{domain.name}</h2>
      </div>
      <p className="text-[length:var(--text-base)] leading-[var(--leading-relaxed)] text-[var(--text-secondary)]">
        {domain.executiveSummary}
      </p>
    </section>
  );
}
