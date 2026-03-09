import type { AuditDomain } from '../data/auditData';

interface ExecutiveSummaryProps {
  domain: AuditDomain;
}

export function ExecutiveSummary({ domain }: ExecutiveSummaryProps) {
  return (
    <section className="mb-12">
      <div className="mb-3">
        <div className="text-xs font-semibold tracking-wide mb-2" style={{ color: 'var(--text-tertiary)' }}>
          EXECUTIVE SUMMARY
        </div>
        <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
          {domain.name}
        </h2>
      </div>
      <p 
        className="leading-relaxed" 
        style={{ 
          color: 'var(--text-secondary)',
          fontSize: 'var(--text-base)',
          lineHeight: 'var(--leading-relaxed)'
        }}
      >
        {domain.executiveSummary}
      </p>
    </section>
  );
}
