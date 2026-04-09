import { Check, X } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { cn } from '../../components/ui/utils';

const ROWS: { label: string; express: boolean | 'partial'; full: boolean | 'partial' }[] = [
  { label: 'Time to first actionable output', express: true, full: true },
  { label: 'Depth on processes and systems', express: 'partial', full: true },
  { label: 'UX and conversion (hands-on review)', express: 'partial', full: true },
  { label: 'Integrations and automation', express: false, full: true },
  { label: 'Roadmap with impact / effort priorities', express: 'partial', full: true },
  { label: 'Handoff-ready for another team', express: true, full: true },
];

function Cell({ v }: { v: boolean | 'partial' }) {
  if (v === true) {
    return <Check className="mx-auto h-5 w-5" style={{ color: 'var(--glc-green-dark)' }} weight="bold" aria-label="Yes" />;
  }
  if (v === 'partial') {
    return (
      <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
        Partial
      </span>
    );
  }
  return <X className="mx-auto h-5 w-5" style={{ color: 'var(--text-quaternary)' }} aria-label="No" />;
}

export function AuditCompare({ compact = false }: { compact?: boolean }) {
  return (
    <div
      className="overflow-hidden glc-card"
      style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-card)' }}
    >
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-muted)' }}>
              <th className="px-4 py-3 text-left font-semibold sm:px-6" style={{ color: 'var(--text-primary)' }}>
                Criterion
              </th>
              <th className="px-4 py-3 text-center font-semibold sm:px-6" style={{ color: 'var(--text-primary)' }}>
                Express
              </th>
              <th className="px-4 py-3 text-center font-semibold sm:px-6" style={{ color: 'var(--text-primary)' }}>
                Full audit
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr key={row.label} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <td className="px-4 py-3.5 sm:px-6" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </td>
                <td className="px-4 py-3.5 text-center sm:px-6">
                  <Cell v={row.express} />
                </td>
                <td className="px-4 py-3.5 text-center sm:px-6">
                  <Cell v={row.full} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!compact && (
        <div
          className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-6"
          style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-inset)' }}
        >
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
            Express when you need a fast external view. Full when systemic bottlenecks and a roadmap matter.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/express-audit"
              className={cn('rounded-lg px-3 py-2 text-xs font-semibold')}
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              Express
            </Link>
            <Link
              to="/audit"
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: 'var(--gradient-brand)',
                color: 'var(--primary-foreground)',
              }}
            >
              Full audit
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
