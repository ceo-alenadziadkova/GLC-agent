import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ArrowsClockwise, Lightning, Spinner, Warning, Tray } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { api } from '../data/apiService';
import type { AuditMeta } from '../data/auditTypes';
import { isSnapshotStyleAudit } from '../lib/audit-execution-plan';
import { ADMIN_SNAPSHOT_QUEUE_CONFIG } from '../config/admin-snapshot-queue-config';
import { ADMIN_SNAPSHOT_QUEUE_COPY } from '../config/admin-snapshot-queue-copy.en';
import { cn } from '../components/ui/utils';
import { Button } from '../components/ui/button';
import { useTablistKeyboardNavigation } from '../hooks/useTablistKeyboardNavigation';
import { formatAppMediumDateTime } from '../lib/date-format';
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

type SnapshotStatusFilter = 'all' | 'running' | 'completed' | 'failed';

function matchesStatusFilter(audit: AuditMeta, filter: SnapshotStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'running') return audit.status !== 'completed' && audit.status !== 'failed';
  return audit.status === filter;
}

function scoreText(score: number | null): string {
  if (score == null || !Number.isFinite(score)) return ADMIN_SNAPSHOT_QUEUE_COPY.noScoreYet;
  return `${Math.round(score * 10) / 10}/5`;
}

export function AdminSnapshotQueue() {
  const filterOrder = ['all', 'running', 'completed', 'failed'] as const;
  const tabPanelId = 'admin-snapshot-queue-panel';
  const [filter, setFilter] = useState<SnapshotStatusFilter>('all');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const q = useQuery({
    queryKey: ['glc', 'admin', 'snapshot-queue'],
    queryFn: async () => {
      const { data } = await api.listAudits(
        ADMIN_SNAPSHOT_QUEUE_CONFIG.listAuditsLimit,
        ADMIN_SNAPSHOT_QUEUE_CONFIG.listAuditsOffset,
      );
      return data.filter((audit) => isSnapshotStyleAudit(audit));
    },
    staleTime: ADMIN_SNAPSHOT_QUEUE_CONFIG.staleTimeMs,
  });

  const filtered = useMemo(
    () => (q.data ?? []).filter((audit) => matchesStatusFilter(audit, filter)),
    [q.data, filter],
  );
  const { setTabRef, handleTablistKeyDown } = useTablistKeyboardNavigation({
    order: filterOrder,
    activeKey: filter,
    onChange: setFilter,
  });

  async function handleDelete(auditId: string) {
    setDeleting(auditId);
    setDeleteError(null);
    try {
      await api.deleteAudit(auditId);
      await q.refetch();
    } catch {
      setDeleteError(ADMIN_SNAPSHOT_QUEUE_COPY.deleteFailed);
    } finally {
      setDeleting(null);
    }
  }

  return (
    <AppShell
      title={ADMIN_SNAPSHOT_QUEUE_COPY.title}
      subtitle={ADMIN_SNAPSHOT_QUEUE_COPY.subtitle}
      actions={(
        <Button type="button" variant="outline" size="sm" className="glc-touch-target text-sm sm:min-h-0" onClick={() => void q.refetch()}>
          <ArrowsClockwise className="w-4 h-4" /> {ADMIN_SNAPSHOT_QUEUE_COPY.refresh}
        </Button>
      )}
    >
      <div className="glc-page-content max-w-5xl mx-auto space-y-4">
        <div
          className="flex gap-2 flex-wrap"
          role="tablist"
          aria-label={ADMIN_SNAPSHOT_QUEUE_COPY.title}
          onKeyDown={handleTablistKeyDown}
        >
          {(['all', 'running', 'completed', 'failed'] as const).map((tab) => (
            <button
              ref={setTabRef(tab)}
              key={tab}
              type="button"
              role="tab"
              id={`admin-snapshot-queue-tab-${tab}`}
              aria-controls={tabPanelId}
              aria-selected={filter === tab}
              tabIndex={filter === tab ? 0 : -1}
              className={cn(
                'glc-touch-target rounded-lg border px-3 py-2 text-xs font-medium capitalize sm:min-h-0 sm:py-1.5',
                filter === tab ? 'border-info/50 bg-info/10 text-info' : 'bg-card text-muted-foreground',
              )}
              onClick={() => setFilter(tab)}
            >
              {ADMIN_SNAPSHOT_QUEUE_COPY.statusFilters[tab]}
            </button>
          ))}
        </div>
        <section
          id={tabPanelId}
          role="tabpanel"
          aria-labelledby={`admin-snapshot-queue-tab-${filter}`}
          className="space-y-4"
        >
          {deleteError && (
            <div className="bg-destructive/10 text-destructive border-destructive/40 flex items-center gap-3 rounded-lg border px-4 py-3">
              <Warning className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{deleteError}</span>
            </div>
          )}

          {q.isPending && !q.data && (
            <div className="flex justify-center py-16">
              <Spinner className="text-info h-6 w-6 animate-spin" />
            </div>
          )}

          {!q.isPending && q.error && (
            <div className="bg-destructive/10 text-destructive border-destructive/40 flex items-center gap-3 rounded-lg border px-4 py-3">
              <Warning className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{ADMIN_SNAPSHOT_QUEUE_COPY.loadFailed}</span>
            </div>
          )}

          {!q.isPending && !q.error && filtered.length === 0 && (
            <div className="text-muted-foreground py-16 text-center">
              <Tray className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
              <p className="text-sm font-medium">{ADMIN_SNAPSHOT_QUEUE_COPY.emptyState}</p>
            </div>
          )}

          {!q.isPending && !q.error && filtered.length > 0 && (
            <div className="space-y-3">
              {filtered
                .slice()
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                .map((audit) => {
                  const createdAt = formatAppMediumDateTime(audit.created_at);
                  const statusClass =
                    audit.status === 'completed'
                      ? 'text-success'
                      : audit.status === 'failed'
                        ? 'text-destructive'
                        : 'text-info';
                  return (
                    <div
                      key={audit.id}
                      className="bg-card rounded-xl border px-4 py-4 mobile:px-5"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Lightning className="text-info h-4 w-4" />
                            <span className="text-foreground truncate text-sm font-medium">{audit.company_url}</span>
                          </div>
                          <div className="text-muted-foreground mt-1 text-xs">
                            {ADMIN_SNAPSHOT_QUEUE_COPY.submittedPrefix} {createdAt}
                            {audit.client_id
                              ? ` · ${ADMIN_SNAPSHOT_QUEUE_COPY.clientPrefix} ${audit.client_id.slice(0, 8)}...`
                              : ''}
                          </div>
                          <div className="text-muted-foreground mt-1.5 text-xs">
                            {ADMIN_SNAPSHOT_QUEUE_COPY.snapshotResultPrefix} {scoreText(audit.overall_score)}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 sm:justify-end">
                          <span className={cn('text-xs font-medium capitalize', statusClass)}>{audit.status}</span>
                          <Link to={`/audit/${audit.id}`} className="text-info glc-touch-target -mx-1 rounded-md px-1 text-xs font-medium no-underline sm:min-h-0">
                            {ADMIN_SNAPSHOT_QUEUE_COPY.openAudit}
                          </Link>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={deleting === audit.id}
                            onClick={() => setDeleteTarget(audit.id)}
                            className="glc-touch-target text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive sm:min-h-0"
                          >
                            {deleting === audit.id
                              ? ADMIN_SNAPSHOT_QUEUE_COPY.deleting
                              : ADMIN_SNAPSHOT_QUEUE_COPY.deleteSnapshot}
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </section>
        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={open => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{ADMIN_SNAPSHOT_QUEUE_COPY.deleteDialogTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {ADMIN_SNAPSHOT_QUEUE_COPY.deleteDialogDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">
                {ADMIN_SNAPSHOT_QUEUE_COPY.deleteDialogCancel}
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  if (target) {
                    void handleDelete(target);
                  }
                }}
              >
                {ADMIN_SNAPSHOT_QUEUE_COPY.deleteDialogConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
