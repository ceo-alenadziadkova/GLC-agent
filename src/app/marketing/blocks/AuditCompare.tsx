import { Check, X } from '@phosphor-icons/react';
import { Link } from 'react-router';
import { cn } from '../../components/ui/utils';
import { AUDIT_COMPARE_FOCUSED_ROW_LABELS } from '../../config/audit-compare-marketing';
import workspacePackaging from '../../data/marketing-workspace-packaging.en.json';

const HEADER_BG =
  'linear-gradient(135deg, color-mix(in oklab, var(--bg-muted) 82%, transparent) 0%, color-mix(in oklab, var(--glc-blue-muted) 45%, transparent) 100%)';

const ROWS: { label: string; starter: boolean | 'partial'; pro: boolean | 'partial'; complete: boolean | 'partial' }[] = [
  { label: 'Coverage breadth', starter: 'partial', pro: 'partial', complete: true },
  { label: 'Cross-domain dependency visibility', starter: false, pro: 'partial', complete: true },
  { label: 'Speed to first focused actions', starter: true, pro: true, complete: true },
  { label: 'System-wide comparability of score', starter: false, pro: 'partial', complete: true },
  { label: 'Roadmap depth and sequencing', starter: 'partial', pro: true, complete: true },
  { label: 'Handoff-ready for another team', starter: true, pro: true, complete: true },
];

const EMPHASIS_SURFACE = 'color-mix(in oklab, var(--glc-blue-muted) 34%, transparent)';
const STRATEGY_HEADER_SURFACE = 'color-mix(in oklab, var(--glc-blue-muted) 44%, var(--bg-surface))';

function Cell({ v }: { v: boolean | 'partial' }) {
  if (v === true) {
    return <Check className="mx-auto h-5 w-5" style={{ color: 'var(--glc-green-dark)' }} weight="bold" aria-label="Yes" />;
  }
  if (v === 'partial') {
    return (
      <span className="text-xs font-medium ds-text-tertiary" >
        Partial
      </span>
    );
  }
  return <X className="mx-auto h-5 w-5 ds-text-quaternary"  aria-label="No" />;
}

export function AuditCompare({
  compact = false,
  /** Shorter matrix for Focus / Context pages. */
  focusedPackage,
  /** Highlights a tier column (Strategy page uses `strategy`). */
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

  const colStyle = (key: 'starter' | 'pro' | 'strategy') => {
    if (resolvedEmphasis === key) return { backgroundColor: EMPHASIS_SURFACE };
    if (resolvedEmphasis === 'none' && key === 'strategy') {
      return { backgroundColor: 'color-mix(in oklab, var(--glc-blue-muted) 24%, transparent)' };
    }
    return {};
  };

  return (
    <div
      className={cn('overflow-hidden border', !flatChrome && 'glc-card')}
      style={{
        borderRadius: flatChrome ? 'var(--radius-xl)' : 'var(--radius-2xl)',
        borderColor: 'var(--border-subtle)',
        boxShadow: flatChrome ? 'none' : 'var(--shadow-card)',
      }}
    >
      <div
        className={cn(
          'overflow-x-auto',
          useStickyHeader && 'md:max-h-[min(70vh,32.5rem)] md:overflow-y-auto',
        )}
      >
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-subtle)',
                background: HEADER_BG,
              }}
            >
              <th
                className={cn(
                  'px-4 py-3 text-left text-[13px] font-bold uppercase tracking-[0.04em] sm:px-6',
                  useStickyHeader && 'md:sticky md:top-0 md:z-[2]',
                )}
                style={{
                  color: 'var(--text-primary)',
                  ...(useStickyHeader
                    ? {
                        background: HEADER_BG,
                        boxShadow: '0 1px 0 var(--border-subtle)',
                      }
                    : {}),
                }}
              >
                Criterion
              </th>
              <th
                className={cn(
                  'px-4 py-3 text-center text-[13px] font-bold uppercase tracking-[0.04em] sm:px-6',
                  useStickyHeader && 'md:sticky md:top-0 md:z-[2]',
                )}
                style={{
                  color: 'var(--text-primary)',
                  ...(resolvedEmphasis === 'none' ? { backgroundColor: STRATEGY_HEADER_SURFACE } : null),
                  ...(useStickyHeader
                    ? {
                        background: resolvedEmphasis === 'none' ? STRATEGY_HEADER_SURFACE : HEADER_BG,
                        boxShadow: '0 1px 0 var(--border-subtle)',
                      }
                    : {}),
                }}
              >
                {quick.title}
              </th>
              <th
                className={cn(
                  'px-4 py-3 text-center text-[13px] font-bold uppercase tracking-[0.04em] sm:px-6',
                  useStickyHeader && 'md:sticky md:top-0 md:z-[2]',
                )}
                style={{
                  color: 'var(--text-primary)',
                  ...(resolvedEmphasis === 'pro' ? { backgroundColor: 'color-mix(in oklab, var(--glc-blue-muted) 62%, var(--bg-surface))' } : null),
                  ...(useStickyHeader
                    ? {
                        background: resolvedEmphasis === 'pro'
                          ? 'color-mix(in oklab, var(--glc-blue-muted) 62%, var(--bg-surface))'
                          : HEADER_BG,
                        boxShadow: '0 1px 0 var(--border-subtle)',
                      }
                    : {}),
                }}
              >
                {full.title}
              </th>
              <th
                className={cn(
                  'px-4 py-3 text-center text-[13px] font-bold uppercase tracking-[0.04em] sm:px-6',
                  useStickyHeader && 'md:sticky md:top-0 md:z-[2]',
                )}
                style={{
                  color: 'var(--text-primary)',
                  ...(useStickyHeader
                    ? {
                        background: HEADER_BG,
                        boxShadow: '0 1px 0 var(--border-subtle)',
                      }
                    : {}),
                }}
              >
                {strategy.title}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr
                key={row.label}
                className="transition-colors"
                style={{
                  borderBottom: '1px solid var(--border-subtle)',
                  backgroundColor: row.label === 'Coverage breadth' ? 'color-mix(in oklab, var(--glc-blue-muted) 26%, transparent)' : 'transparent',
                }}
              >
                <td className="px-4 py-3.5 sm:px-6 ds-text-secondary" >
                  {row.label}
                </td>
                <td className="px-4 py-3.5 text-center sm:px-6" style={colStyle('starter')}>
                  <Cell v={row.starter} />
                </td>
                <td className="px-4 py-3.5 text-center sm:px-6" style={colStyle('pro')}>
                  <Cell v={row.pro} />
                </td>
                <td className="px-4 py-3.5 text-center sm:px-6" style={colStyle('strategy')}>
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
          <p className="text-xs leading-relaxed ds-text-tertiary" >
            {workspacePackaging.audit_compare_footer}
          </p>
          <div className="flex flex-wrap gap-2">
            <Link
              to="/starter"
              className={cn('rounded-lg px-3 py-2 text-xs font-semibold')}
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              {quick.title}
            </Link>
            <Link
              to="/pro"
              className="rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                background: 'var(--gradient-brand)',
                color: 'var(--primary-foreground)',
              }}
            >
              {full.title}
            </Link>
            <Link
              to="/complete"
              className={cn('rounded-lg px-3 py-2 text-xs font-semibold')}
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
            >
              {strategy.title}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
