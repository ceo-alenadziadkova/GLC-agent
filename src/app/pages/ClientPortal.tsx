import { useState, useEffect } from 'react';
import { Link } from 'react-router';
import {
  ClipboardText, Clock, CheckCircle, XCircle, Spinner,
  ArrowRight, PlusCircle, Warning,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { api } from '../data/apiService';
import type { AuditRequest, AuditRequestStatus } from '../data/auditTypes';

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<AuditRequestStatus, { label: string; color: string; Icon: React.ElementType }> = {
  draft:        { label: 'Draft',        color: 'rgba(255,255,255,0.30)', Icon: ClipboardText },
  submitted:    { label: 'Submitted',    color: '#F59E0B',               Icon: Clock         },
  under_review: { label: 'Under Review', color: '#3B82F6',               Icon: Clock         },
  approved:     { label: 'Approved',     color: '#10B981',               Icon: CheckCircle   },
  rejected:     { label: 'Rejected',     color: '#EF4444',               Icon: XCircle       },
  running:      { label: 'In Progress',  color: '#1CBDFF',               Icon: Spinner       },
  delivered:    { label: 'Delivered',    color: '#10B981',               Icon: CheckCircle   },
};

function StatusBadge({ status }: { status: AuditRequestStatus }) {
  const { label, color, Icon } = STATUS_CONFIG[status] ?? STATUS_CONFIG.draft;
  const spinning = status === 'running';
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium" style={{ color }}>
      <Icon className={`w-3.5 h-3.5 ${spinning ? 'animate-spin' : ''}`} />
      {label}
    </span>
  );
}

function RequestCard({ req }: { req: AuditRequest }) {
  const domain = (() => { try { return new URL(req.url).hostname; } catch { return req.url; } })();
  const date = new Date(req.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const linkTarget = req.audit_id
    ? `/portal/audit/${req.audit_id}`
    : `/portal/request/${req.id}`;

  return (
    <Link
      to={linkTarget}
      className="block no-underline"
    >
      <div
        className="rounded-xl px-5 py-4 flex items-center gap-4 transition-all"
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          transition: 'border-color var(--ease-fast), background var(--ease-fast)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'rgba(28,189,255,0.25)';
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-surface-hover)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
          (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--bg-surface)';
        }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: 'rgba(28,189,255,0.08)', border: '1px solid rgba(28,189,255,0.15)' }}
        >
          <ClipboardText className="w-5 h-5" style={{ color: 'var(--glc-blue)' }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="font-medium truncate"
              style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
            >
              {domain}
            </span>
            {req.industry && (
              <span
                className="px-1.5 py-0.5 rounded text-xs flex-shrink-0"
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: 'var(--text-tertiary)' }}
              >
                {req.industry}
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5">
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{date}</span>
            <span
              className="px-1.5 py-0.5 rounded text-xs"
              style={{
                backgroundColor: 'rgba(255,255,255,0.04)',
                color: 'var(--text-tertiary)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              {req.product_mode === 'full' ? 'Full Audit' : 'Express'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-4 flex-shrink-0">
          <StatusBadge status={req.status} />
          <ArrowRight className="w-4 h-4" style={{ color: 'rgba(255,255,255,0.20)' }} />
        </div>
      </div>
    </Link>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ClientPortal() {
  const [requests, setRequests] = useState<AuditRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listAuditRequests()
      .then(res => setRequests(res.data))
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const actions = (
    <Link
      to="/portal/request"
      className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium no-underline transition-all"
      style={{
        background: 'var(--gradient-brand)',
        color: 'var(--glc-ink)',
        boxShadow: 'var(--glow-blue-sm)',
      }}
    >
      <PlusCircle className="w-4 h-4" />
      New Request
    </Link>
  );

  return (
    <AppShell title="My Portal" subtitle="Track your audit requests" actions={actions}>
      <div className="px-7 py-6 max-w-3xl mx-auto">

        {loading && (
          <div className="flex items-center justify-center py-20">
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

        {!loading && !error && requests.length === 0 && (
          <div className="text-center py-20">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ backgroundColor: 'rgba(28,189,255,0.08)', border: '1px solid rgba(28,189,255,0.15)' }}
            >
              <ClipboardText className="w-7 h-7" style={{ color: 'var(--glc-blue)' }} />
            </div>
            <h3
              className="font-semibold mb-2"
              style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}
            >
              No requests yet
            </h3>
            <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginBottom: 20 }}>
              Submit your first audit request to get started.
            </p>
            <Link
              to="/portal/request"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium no-underline"
              style={{ background: 'var(--gradient-brand)', color: 'var(--glc-ink)' }}
            >
              <PlusCircle className="w-4 h-4" />
              Submit Request
            </Link>
          </div>
        )}

        {!loading && !error && requests.length > 0 && (
          <div className="space-y-3">
            {requests.map(req => (
              <RequestCard key={req.id} req={req} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
