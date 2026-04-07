import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';
import { ArrowsClockwise, Lightning, Spinner, Warning, Tray } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { api } from '../data/apiService';
import type { AuditMeta } from '../data/auditTypes';

type SnapshotStatusFilter = 'all' | 'running' | 'completed' | 'failed';

function matchesStatusFilter(audit: AuditMeta, filter: SnapshotStatusFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'running') return audit.status !== 'completed' && audit.status !== 'failed';
  return audit.status === filter;
}

function scoreText(score: number | null): string {
  if (score == null || !Number.isFinite(score)) return 'No score yet';
  return `${Math.round(score * 10) / 10}/5`;
}

export function AdminSnapshotQueue() {
  const [filter, setFilter] = useState<SnapshotStatusFilter>('all');
  const q = useQuery({
    queryKey: ['glc', 'admin', 'snapshot-queue'],
    queryFn: async () => {
      const { data } = await api.listAudits(500, 0);
      return data.filter((a) => a.product_mode === 'free_snapshot');
    },
    staleTime: 180_000,
  });

  const snapshots = q.data ?? [];
  const filtered = useMemo(
    () => snapshots.filter((audit) => matchesStatusFilter(audit, filter)),
    [snapshots, filter],
  );

  return (
    <AppShell
      title="Snapshot queue"
      subtitle="All free snapshot submissions and their current results"
      actions={(
        <button type="button" className="glc-btn-secondary text-sm glc-touch-target sm:min-h-0" onClick={() => void q.refetch()}>
          <ArrowsClockwise className="w-4 h-4" /> Refresh
        </button>
      )}
    >
      <div className="glc-page-content max-w-5xl mx-auto space-y-4">
        <div className="flex gap-2 flex-wrap">
          {(['all', 'running', 'completed', 'failed'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              className="px-3 py-2 rounded-lg text-xs font-medium capitalize glc-touch-target sm:min-h-0 sm:py-1.5"
              style={{
                background: filter === tab ? 'rgba(28,189,255,0.15)' : 'var(--bg-surface)',
                border: `1px solid ${filter === tab ? 'rgba(28,189,255,0.35)' : 'var(--border-subtle)'}`,
                color: filter === tab ? 'var(--glc-blue)' : 'var(--text-secondary)',
              }}
              onClick={() => setFilter(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        {q.isPending && !q.data && (
          <div className="flex justify-center py-16">
            <Spinner className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
          </div>
        )}

        {!q.isPending && q.error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg" style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}>
            <Warning className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">Failed to load snapshot queue.</span>
          </div>
        )}

        {!q.isPending && !q.error && filtered.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <Tray className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-quaternary)' }} />
            <p className="text-sm font-medium">No snapshots in this view</p>
          </div>
        )}

        {!q.isPending && !q.error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered
              .slice()
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((audit) => {
                const createdAt = new Date(audit.created_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                const statusColor =
                  audit.status === 'completed' ? '#10B981'
                    : audit.status === 'failed' ? '#EF4444'
                      : 'var(--glc-blue)';
                return (
                  <div
                    key={audit.id}
                    className="rounded-xl px-4 py-4 mobile:px-5"
                    style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <Lightning className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{audit.company_url}</span>
                        </div>
                        <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                          Submitted: {createdAt}
                          {audit.client_id ? ` · client ${audit.client_id.slice(0, 8)}...` : ''}
                        </div>
                        <div className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
                          Snapshot result: {scoreText(audit.overall_score)}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-shrink-0 sm:justify-end">
                        <span className="text-xs font-medium capitalize" style={{ color: statusColor }}>{audit.status}</span>
                        <Link to={`/audit/${audit.id}`} className="text-xs font-medium no-underline glc-touch-target sm:min-h-0 px-1 -mx-1 rounded-md" style={{ color: 'var(--glc-blue)' }}>
                          Open audit
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
