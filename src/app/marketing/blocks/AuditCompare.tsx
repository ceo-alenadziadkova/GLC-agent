import { Check, X } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { cn } from '../../components/ui/utils';
import { AUDIT_COMPARE_FOCUSED_ROW_LABELS } from '../../config/audit-compare-marketing';
import workspacePackaging from '../../locales/en/marketing-workspace-packaging.en.json';

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
    return (
      <Check
        className="mx-auto h-5 w-5 text-[color:var(--glc-green-dark)]"
        weight="bold"
        aria-label="Yes"
      />
    );
  }
  if (v === 'partial') {
    return (
      <span className="text-xs font-medium ds-text-tertiary">
        Partial
      </span>
    );
  }
  return <X className="mx-auto h-5 w-5 ds-text-quaternary" aria-label="No" />;
}

function colClass(key: 'starter' | 'pro' | 'strategy', resolvedEmphasis: 'none' | 'starter' | 'pro' | 'strategy') {
  if (resolvedEmphasis === key) return 'ds-audit-compare-col-emphasis';
  if (resolvedEmphasis === 'none' && key === 'strategy') return 'ds-audit-compare-col-strategy';
  return '';
}

export function AuditCompare({
  compact = false,
  focusedPackage,
  emphasisColumn = 'none',
}: {
  compact?: boolean;
  focusedPackage?: 'starter' | 'pro';
  emphasisColumn?: 'none' | 'starter' | 'pro' | 'strategy';
}) {
  const { quick, full, strategy } = workspacePackaging.packages;

  const resolvedEmphasis: 'none' | 'starter' | 'pro' | 'strategy' =
    emphasisColumn !== 'none'
      ? emphasisColumn
      : focusedPackage === 'starter'
        ? 'starter'
        : focusedPackage === 'pro'
          ? 'pro'
          : 'none';

  const rows =
    focusedPackage != null
      ? ROWS.filter(r => (AUDIT_COMPARE_FOCUSED_ROW_LABELS[focusedPackage] as readonly string[]).includes(r.label))
      : ROWS;

  const useStickyHeader = compact || focusedPackage != null;
  const flatChrome = compact || focusedPackage != null;

  const thClass =
    'px-4 py-3 text-center text-[length:var(--text-sm)] font-bold uppercase tracking-[var(--tracking-wide)] sm:px-6';
  const thLeftClass =
    'px-4 py-3 text-left text-[length:var(--text-sm)] font-bold uppercase tracking-[var(--tracking-wide)] sm:px-6';

  return (
    <div
      className={cn(
        'overflow-hidden',
        flatChrome
          ? 'ds-audit-compare-root-flat'
          : 'glc-card rounded-[var(--radius-2xl)] border-[var(--border-subtle)] shadow-[var(--shadow-card)]',
      )}
    >
      <div
        className={cn('ds-audit-compare-scroll-region', useStickyHeader && 'ds-audit-compare-scroll-region--sticky')}
      >
        <table className="ds-audit-compare-table w-full border-collapse text-sm">
          <thead>
            <tr className="ds-audit-compare-thead-row">
              <th
                className={cn(
                  thLeftClass,
                  'ds-audit-compare-th-base',
                  useStickyHeader && 'md:sticky md:top-0 md:z-[2] ds-audit-compare-th-bg-header ds-audit-compare-th-sticky-shadow',
                )}
              >
                Criterion
              </th>
              <th
                className={cn(
                  thClass,
                  'ds-audit-compare-th-base',
                  useStickyHeader && 'md:sticky md:top-0 md:z-[2] ds-audit-compare-th-sticky-shadow',
                  resolvedEmphasis === 'none'
                    ? 'ds-audit-compare-th-bg-strategy'
                    : useStickyHeader
                      ? 'ds-audit-compare-th-bg-header'
                      : '',
                )}
              >
                {quick.title}
              </th>
              <th
                className={cn(
                  thClass,
                  'ds-audit-compare-th-base',
                  useStickyHeader && 'md:sticky md:top-0 md:z-[2] ds-audit-compare-th-sticky-shadow',
                  resolvedEmphasis === 'pro'
                    ? 'ds-audit-compare-th-bg-pro'
                    : useStickyHeader
                      ? 'ds-audit-compare-th-bg-header'
                      : '',
                )}
              >
                {full.title}
              </th>
              <th
                className={cn(
                  thClass,
                  'ds-audit-compare-th-base',
                  useStickyHeader && 'md:sticky md:top-0 md:z-[2] ds-audit-compare-th-sticky-shadow',
                  useStickyHeader ? 'ds-audit-compare-th-bg-header' : '',
                )}
              >
                {strategy.title}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.label}
                className={cn(
                  'ds-audit-compare-row transition-colors',
                  row.label === 'Coverage breadth' && 'ds-audit-compare-row-highlight',
                )}
              >
                <td className="px-4 py-3.5 sm:px-6 ds-text-secondary">
                  {row.label}
                </td>
                <td className={cn('px-4 py-3.5 text-center sm:px-6', colClass('starter', resolvedEmphasis))}>
                  <Cell v={row.starter} />
                </td>
                <td className={cn('px-4 py-3.5 text-center sm:px-6', colClass('pro', resolvedEmphasis))}>
                  <Cell v={row.pro} />
                </td>
                <td className={cn('px-4 py-3.5 text-center sm:px-6', colClass('strategy', resolvedEmphasis))}>
                  <Cell v={row.complete} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {!compact && (
        <div className="ds-audit-compare-footer flex flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-6">
          <p className="text-xs leading-relaxed ds-text-tertiary">
            {workspacePackaging.audit_compare_footer}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link to="/starter" className={cn('rounded-lg px-3 py-2 text-xs font-semibold ds-audit-compare-footer-link')}>
              {quick.title}
            </Link>
            <Link
              to="/pro"
              className="rounded-lg px-3 py-2 text-xs font-semibold ds-audit-compare-footer-link-primary"
            >
              {full.title}
            </Link>
            <Link to="/complete" className={cn('rounded-lg px-3 py-2 text-xs font-semibold ds-audit-compare-footer-link')}>
              {strategy.title}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
