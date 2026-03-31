import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router';
import {
  ClipboardText, Clock, CheckCircle, XCircle, Spinner,
  ArrowRight, Warning, Tray,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { api } from '../data/apiService';
import type { AuditRequest, AuditRequestStatus } from '../data/auditTypes';

const STATUS_CONFIG: Record<AuditRequestStatus, { label: string; color: string }> = {
  draft:        { label: 'Draft',        color: 'rgba(255,255,255,0.30)' },
  submitted:    { label: 'Submitted',    color: '#F59E0B' },
  under_review: { label: 'Under Review', color: '#3B82F6' },
  approved:     { label: 'Approved',     color: '#10B981' },
  rejected:     { label: 'Rejected',     color: '#EF4444' },
  running:      { label: 'In Progress',  color: '#1CBDFF' },
  delivered:    { label: 'Delivered',    color: '#10B981' },
};

function StatusBadge({ status }: { status: AuditRequestStatus }) {
  const { label, color } = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  return (
    <span className="text-xs font-medium" style={{ color }}>{label}</span>
  );
}

export function AdminRequestQueue() {
  const [requests, setRequests] = useState<AuditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<{ id: string; text: string } | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    api.listAuditRequests(100, 0)
      .then(res => setRequests(res.data))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const pending = (s: AuditRequestStatus) => s === 'submitted' || s === 'under_review';

  const visible = filter === 'pending'
    ? requests.filter(r => pending(r.status))
    : requests;

  async function approve(id: string) {
    setBusyId(id);
    try {
      await api.approveAuditRequest(id);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string, note: string) {
    setBusyId(id);
    try {
      await api.rejectAuditRequest(id, note || undefined);
      setRejectNote(null);
      load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell
      title="Request queue"
      subtitle="Incoming client audit requests (Admin)"
      actions={
        <Link to="/portfolio" className="glc-btn-secondary no-underline text-sm">
          Portfolio
        </Link>
      }
    >
      <div className="px-7 py-6 max-w-4xl mx-auto space-y-4">

        <div className="flex gap-2">
          {(['pending', 'all'] as const).map(f => (
            <button
              key={f}
              type="button"
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              style={{
                background: filter === f ? 'rgba(28,189,255,0.15)' : 'var(--bg-surface)',
                border: `1px solid ${filter === f ? 'rgba(28,189,255,0.35)' : 'var(--border-subtle)'}`,
                color: filter === f ? 'var(--glc-blue)' : 'var(--text-secondary)',
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'pending' ? 'Needs action' : 'All requests'}
            </button>
          ))}
        </div>

        {loading && (
          <div className="flex justify-center py-16">
            <Spinner className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
          </div>
        )}

        {!loading && error && (
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-lg"
            style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}
          >
            <Warning className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!loading && !error && visible.length === 0 && (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <Tray className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-quaternary)' }} />
            <p className="text-sm font-medium">No requests in this view</p>
          </div>
        )}

        {!loading && !error && visible.length > 0 && (
          <div className="space-y-3">
            {visible.map(req => {
              const domain = (() => { try { return new URL(req.url).hostname; } catch { return req.url; } })();
              const date = new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
              const canAct = pending(req.status);

              return (
                <div
                  key={req.id}
                  className="rounded-xl px-5 py-4"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: 'rgba(28,189,255,0.08)', border: '1px solid rgba(28,189,255,0.15)' }}
                      >
                        <ClipboardText className="w-5 h-5" style={{ color: 'var(--glc-blue)' }} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-medium truncate" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                          {domain}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {date} · {req.product_mode === 'full' ? 'Full' : 'Express'} · client {req.client_id?.slice(0, 8) ?? '—'}…
                        </div>
                        {req.client_notes && (
                          <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                            {req.client_notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <StatusBadge status={req.status} />
                      {req.audit_id && (
                        <Link
                          to={`/audit/${req.audit_id}`}
                          className="text-xs font-medium no-underline flex items-center gap-1"
                          style={{ color: 'var(--glc-blue)' }}
                        >
                          Open audit <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>

                  {canAct && (
                    <div className="mt-4 pt-3 flex flex-wrap gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                      <button
                        type="button"
                        disabled={busyId === req.id}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          background: 'rgba(16,185,129,0.12)',
                          color: '#10B981',
                          border: '1px solid rgba(16,185,129,0.25)',
                          opacity: busyId === req.id ? 0.6 : 1,
                        }}
                        onClick={() => approve(req.id)}
                      >
                        {busyId === req.id ? <Spinner className="w-3.5 h-3.5 animate-spin inline" /> : <CheckCircle className="w-3.5 h-3.5 inline mr-1" weight="bold" />}
                        Approve & create audit
                      </button>
                      {rejectNote?.id === req.id ? (
                        <div className="flex flex-col gap-2 w-full">
                          <textarea
                            className="w-full rounded-lg px-3 py-2 text-xs bg-transparent"
                            style={{ border: '1px solid var(--border-default)', color: 'var(--text-primary)' }}
                            placeholder="Reason for rejection (optional)"
                            rows={2}
                            value={rejectNote.text}
                            onChange={e => setRejectNote({ id: req.id, text: e.target.value })}
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-lg text-xs"
                              style={{ background: 'rgba(239,68,68,0.12)', color: '#EF4444' }}
                              onClick={() => reject(req.id, rejectNote.text)}
                              disabled={busyId === req.id}
                            >
                              Confirm reject
                            </button>
                            <button type="button" className="px-3 py-1.5 text-xs" style={{ color: 'var(--text-tertiary)' }} onClick={() => setRejectNote(null)}>
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={busyId === req.id}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium"
                          style={{
                            background: 'rgba(239,68,68,0.08)',
                            color: '#EF4444',
                            border: '1px solid rgba(239,68,68,0.2)',
                          }}
                          onClick={() => setRejectNote({ id: req.id, text: '' })}
                        >
                          <XCircle className="w-3.5 h-3.5 inline mr-1" weight="bold" />
                          Reject
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
