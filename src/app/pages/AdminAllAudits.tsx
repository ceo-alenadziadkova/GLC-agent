import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ArrowsClockwise, Calendar, FunnelSimple, MagnifyingGlass, Trash, Warning } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { useAudits } from '../hooks/useAudits';
import { useProfile } from '../hooks/useProfile';
import type { AuditMeta, AuditOrigin } from '../data/auditTypes';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import { formatAuditWebsiteDisplay } from '../data/no-public-website';
import { formatAppShortDate } from '../lib/date-format';
import { ScoreBadge } from '../components/glc/ScoreBadge';
import { StatusPill } from '../components/glc/StatusPill';
import { getAuditListPillPresentation } from '../lib/pipeline-monitor-helpers';
import { QueueInlineActionLink } from './queue-inline-action-link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import { cn } from '../components/ui/utils';

const STATUS_OPTIONS = [
  'created',
  'recon',
  'auto',
  'analytic',
  'review',
  'completed',
  'failed',
  'cancelled',
] as const;

const SOURCE_OPTIONS: AuditOrigin[] = [
  'snapshot',
  'discovery',
  'prebrief',
  'request_queue',
  'client_direct',
  'consultant_direct',
  'unknown',
];

function formatOpenAriaLabel(template: string, company: string): string {
  return template.replace('{{company}}', company);
}

export function AdminAllAudits() {
  const copy = WORKSPACE_PAGE_COPY.allAudits;
  const tableCopy = copy.table;
  const { canManagePlatformSettings } = useProfile();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [source, setSource] = useState<AuditOrigin | ''>('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');
  const [updatedFrom, setUpdatedFrom] = useState('');
  const [updatedTo, setUpdatedTo] = useState('');
  const [sortBy, setSortBy] = useState<'created_at' | 'updated_at'>('created_at');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { audits, total, hasMore, loadMore, loading, error, reload, deleteAudit } = useAudits(50, {
    status: status ? [status] : undefined,
    source: source ? [source] : undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    updatedFrom: updatedFrom || undefined,
    updatedTo: updatedTo || undefined,
    sortBy,
    sortDir,
  });

  const filtered = useMemo(() => {
    if (!query.trim()) return audits;
    const needle = query.trim().toLowerCase();
    return audits.filter((audit) => {
      const displayUrl = formatAuditWebsiteDisplay(audit.company_url, audit.no_public_website);
      return (
        (audit.company_name || '').toLowerCase().includes(needle) ||
        (audit.industry || '').toLowerCase().includes(needle) ||
        audit.company_url.toLowerCase().includes(needle) ||
        displayUrl.toLowerCase().includes(needle)
      );
    });
  }, [audits, query]);

  const deleteTargetAudit = useMemo(
    () => (deleteTargetId ? audits.find((a) => a.id === deleteTargetId) ?? null : null),
    [audits, deleteTargetId],
  );

  const deleteTargetCompanyLabel = deleteTargetAudit
    ? deleteTargetAudit.company_name ||
      formatAuditWebsiteDisplay(deleteTargetAudit.company_url, deleteTargetAudit.no_public_website)
    : '';

  const actionsGridClass = canManagePlatformSettings
    ? '[grid-template-columns:2fr_1fr_1fr_1fr_1fr_88px_minmax(5.5rem,auto)]'
    : '[grid-template-columns:2fr_1fr_1fr_1fr_1fr_88px_40px]';

  return (
    <AppShell
      title={copy.appShellTitle}
      subtitle={copy.appShellSubtitle}
      actions={(
        <Button type="button" variant="outline" size="sm" className="glc-touch-target sm:min-h-0" onClick={reload}>
          <ArrowsClockwise className="h-4 w-4" /> {copy.refreshButton}
        </Button>
      )}
    >
      <div className="glc-page-content space-y-4">
        <section className="glc-soft-panel space-y-3 p-4 sm:p-5">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="space-y-1">
              <span className="text-muted-foreground text-xs">{copy.searchPlaceholder}</span>
              <div className="bg-card flex items-center gap-2 rounded-md border px-3 py-2">
                <MagnifyingGlass className="text-muted-foreground h-3.5 w-3.5 flex-shrink-0" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={copy.searchPlaceholder}
                  className="h-auto border-0 bg-transparent p-0 shadow-none focus-visible:ring-0"
                />
              </div>
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground text-xs">{copy.statusFilterLabel}</span>
              <select
                className="bg-card h-10 w-full rounded-md border px-3 text-sm"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <option value="">{copy.allOption}</option>
                {STATUS_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground text-xs">{copy.sourceFilterLabel}</span>
              <select
                className="bg-card h-10 w-full rounded-md border px-3 text-sm"
                value={source}
                onChange={(event) => setSource((event.target.value || '') as AuditOrigin | '')}
              >
                <option value="">{copy.allOption}</option>
                {SOURCE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {copy.sourceLabels[item]}
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="space-y-1">
                <span className="text-muted-foreground text-xs">{copy.sortByLabel}</span>
                <select
                  className="bg-card h-10 w-full rounded-md border px-3 text-sm"
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as 'created_at' | 'updated_at')}
                >
                  <option value="created_at">{copy.sortByCreated}</option>
                  <option value="updated_at">{copy.sortByUpdated}</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-muted-foreground text-xs">{copy.sortDirLabel}</span>
                <select
                  className="bg-card h-10 w-full rounded-md border px-3 text-sm"
                  value={sortDir}
                  onChange={(event) => setSortDir(event.target.value as 'asc' | 'desc')}
                >
                  <option value="desc">{copy.sortDirDesc}</option>
                  <option value="asc">{copy.sortDirAsc}</option>
                </select>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <label className="space-y-1">
              <span className="text-muted-foreground text-xs">{copy.createdFromLabel}</span>
              <Input type="date" value={createdFrom} onChange={(event) => setCreatedFrom(event.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground text-xs">{copy.createdToLabel}</span>
              <Input type="date" value={createdTo} onChange={(event) => setCreatedTo(event.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground text-xs">{copy.updatedFromLabel}</span>
              <Input type="date" value={updatedFrom} onChange={(event) => setUpdatedFrom(event.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-muted-foreground text-xs">{copy.updatedToLabel}</span>
              <Input type="date" value={updatedTo} onChange={(event) => setUpdatedTo(event.target.value)} />
            </label>
          </div>
        </section>

        {(error || deleteError) && (
          <div className="text-destructive glc-soft-panel flex items-start gap-2 p-4 text-sm">
            {deleteError && <Warning className="mt-0.5 h-4 w-4 flex-shrink-0" />}
            <span>{deleteError ?? error}</span>
          </div>
        )}

        {loading && filtered.length === 0 && (
          <div className="text-muted-foreground flex items-center justify-center gap-2 py-10 text-sm">
            <ArrowsClockwise className="h-4 w-4 animate-spin" />
            Loading audits...
          </div>
        )}

        {!loading && filtered.length === 0 && !error && (
          <div className="text-muted-foreground py-12 text-center">
            <FunnelSimple className="mx-auto mb-3 h-8 w-8" />
            <p className="text-sm font-medium">{copy.table.emptyTitle}</p>
            <p className="mt-1 text-xs">{copy.table.emptySubtitle}</p>
          </div>
        )}

        {filtered.length > 0 && (
          <div className="glc-card overflow-hidden rounded-xl">
            <div
              className={cn(
                'text-muted-foreground bg-background grid border-b px-5 py-3 text-[length:var(--text-2xs)] font-bold uppercase ds-data-table-header-caps',
                actionsGridClass,
              )}
            >
              <span>{copy.table.headerCompany}</span>
              <span>{copy.table.headerSource}</span>
              <span>{copy.table.headerStatus}</span>
              <span>{copy.table.headerCreated}</span>
              <span>{copy.table.headerUpdated}</span>
              <span>{copy.table.headerScore}</span>
              <span />
            </div>
            {filtered.map((audit: AuditMeta, index: number) => {
              const companyLabel = audit.company_name || formatAuditWebsiteDisplay(audit.company_url, audit.no_public_website);
              const statusPill = getAuditListPillPresentation(audit.status);
              return (
                <div
                  key={audit.id}
                  className={cn(
                    'grid items-center px-5 py-3',
                    actionsGridClass,
                    index < filtered.length - 1 ? 'border-b' : '',
                  )}
                >
                  <div className="min-w-0">
                    <Link to={`/audit/${audit.id}`} className="text-foreground block truncate text-sm font-semibold no-underline">
                      {companyLabel}
                    </Link>
                    <div className="text-muted-foreground truncate text-xs">
                      {formatAuditWebsiteDisplay(audit.company_url, audit.no_public_website)}
                    </div>
                  </div>
                  <span className="text-muted-foreground text-sm">
                    {copy.sourceLabels[audit.origin ?? 'unknown']}
                  </span>
                  <StatusPill status={statusPill.status} pulse={statusPill.pulse} />
                  <span className="text-muted-foreground inline-flex items-center gap-1 text-sm">
                    <Calendar className="h-3.5 w-3.5" />
                    {formatAppShortDate(audit.created_at)}
                  </span>
                  <span className="text-muted-foreground text-sm">{formatAppShortDate(audit.updated_at)}</span>
                  {audit.overall_score !== null
                    ? <ScoreBadge score={Math.round(audit.overall_score)} size="sm" />
                    : <span className="text-muted-foreground text-sm">—</span>}
                  <div className="flex items-center justify-end gap-1">
                    <QueueInlineActionLink
                      to={audit.status === 'created' ? `/pipeline/${audit.id}` : `/audit/${audit.id}`}
                      tone="info"
                      className="h-7 w-7 rounded-md p-0"
                      ariaLabel={formatOpenAriaLabel(copy.table.openIconAriaLabel, companyLabel)}
                    >
                      {copy.table.openButton}
                    </QueueInlineActionLink>
                    {canManagePlatformSettings && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === audit.id}
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive glc-touch-target h-7 w-7 shrink-0 p-0 sm:min-h-0"
                        aria-label={formatOpenAriaLabel(tableCopy.deleteIconAriaLabel, companyLabel)}
                        onClick={() => {
                          setDeleteError(null);
                          setDeleteTargetId(audit.id);
                        }}
                      >
                        <Trash className="h-4 w-4" weight="bold" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {!error && total > audits.length && (
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
            <p className="text-muted-foreground text-xs">
              {copy.table.showingOfTotal
                .replace('{{shown}}', String(audits.length))
                .replace('{{total}}', String(total))}
            </p>
            {hasMore && (
              <Button type="button" variant="outline" size="sm" onClick={loadMore}>
                {copy.table.loadMoreButton}
              </Button>
            )}
          </div>
        )}
      </div>

      <AlertDialog
        open={deleteTargetId !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTargetId(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tableCopy.deleteDialogTitle}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <span>
                {tableCopy.deleteDialogDescriptionPrefix}
                {deleteTargetCompanyLabel ? (
                  <>
                    {' '}
                    <span className="font-medium text-foreground">{deleteTargetCompanyLabel}</span>
                  </>
                ) : null}
                {tableCopy.deleteDialogDescriptionMiddle}
                {tableCopy.deleteDialogDescriptionSuffix}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">{tableCopy.deleteDialogCancel}</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const target = deleteTargetId;
                setDeleteTargetId(null);
                if (!target) return;
                setDeletingId(target);
                setDeleteError(null);
                void deleteAudit(target)
                  .catch(() => setDeleteError(tableCopy.deleteFailed))
                  .finally(() => setDeletingId(null));
              }}
            >
              {tableCopy.deleteDialogConfirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

