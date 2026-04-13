import { Check, X } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { cn } from '../../components/ui/utils';

const ROWS: { label: string; starter: boolean | 'partial'; pro: boolean | 'partial'; complete: boolean | 'partial' }[] = [
  { label: 'Coverage breadth', starter: 'partial', pro: 'partial', complete: true },
  { label: 'Cross-domain dependency visibility', starter: false, pro: 'partial', complete: true },
  { label: 'Speed to first focused actions', starter: true, pro: true, complete: true },
  { label: 'System-wide comparability of score', starter: false, pro: 'partial', complete: true },
  { label: 'Roadmap depth and sequencing', starter: 'partial', pro: true, complete: true },
  { label: 'Handoff-ready for another team', starter: true, pro: true, complete: true },
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
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                background:
                  'linear-gradient(135deg, color-mix(in oklab, var(--bg-muted) 82%, transparent) 0%, color-mix(in oklab, var(--glc-blue-muted) 45%, transparent) 100%)',
              }}
            >
              <th className="px-4 py-3 text-left font-semibold sm:px-6" style={{ color: 'var(--text-primary)' }}>
                Criterion
              </th>
              <th className="px-4 py-3 text-center font-semibold sm:px-6" style={{ color: 'var(--text-primary)' }}>
                Starter
              </th>
              <th className="px-4 py-3 text-center font-semibold sm:px-6" style={{ color: 'var(--text-primary)' }}>
                Pro
              </th>
              <th className="px-4 py-3 text-center font-semibold sm:px-6" style={{ color: 'var(--text-primary)' }}>
                Complete
              </th>
            </tr>
          </thead>
          <tbody>
            {ROWS.map(row => (
              <tr
                key={row.label}
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: row.label === 'Coverage breadth' ? 'color-mix(in oklab, var(--glc-blue-muted) 26%, transparent)' : 'transparent',
                }}
              >
                <td className="px-4 py-3.5 sm:px-6" style={{ color: 'var(--text-secondary)' }}>
                  {row.label}
                </td>
                <td className="px-4 py-3.5 text-center sm:px-6">
                  <Cell v={row.starter} />
                </td>
                <td className="px-4 py-3.5 text-center sm:px-6">
                  <Cell v={row.pro} />
                </td>
                <td className="px-4 py-3.5 text-center sm:px-6">
                  <Cell v={row.complete} />
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
            Starter for one urgent area, Pro for a focused pack, Complete for full cross-domain confidence.
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/starter"
              className={cn('rounded-lg px-3 py-2 text-xs font-semibold')}
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              Starter
            </Link>
            <Link
              to="/pro"
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: 'var(--gradient-brand)',
                color: 'var(--primary-foreground)',
              }}
            >
              Pro
            </Link>
            <Link
              to="/complete"
              className={cn('rounded-lg px-3 py-2 text-xs font-semibold')}
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              Complete
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
