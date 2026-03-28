import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router';
import {
  CheckCircle, Clock, XCircle, Spinner, Warning,
  ArrowLeft, Pulse, FileText, Globe, ChatCircle,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { api } from '../data/apiService';
import type { AuditRequest, AuditRequestStatus } from '../data/auditTypes';

// ── Status step timeline ──────────────────────────────────────────────────────

const STEPS: { status: AuditRequestStatus; label: string; description: string }[] = [
  { status: 'submitted',    label: 'Request Submitted',  description: 'Your request is in our queue.' },
  { status: 'under_review', label: 'Under Review',       description: 'The consultant is reviewing your request.' },
  { status: 'approved',     label: 'Approved',           description: 'Audit approved and being set up.' },
  { status: 'running',      label: 'Audit in Progress',  description: 'Our AI pipeline is running your audit.' },
  { status: 'delivered',    label: 'Delivered',          description: 'Your audit report is ready.' },
];

const STATUS_ORDER: AuditRequestStatus[] = [
  'draft', 'submitted', 'under_review', 'approved', 'rejected', 'running', 'delivered',
];

function getStepIndex(status: AuditRequestStatus) {
  return STATUS_ORDER.indexOf(status);
}

function StepTimeline({ status }: { status: AuditRequestStatus }) {
  const currentIdx = getStepIndex(status);
  const isRejected = status === 'rejected';

  return (
    <div className="space-y-0">
      {STEPS.map((step, i) => {
        const stepIdx = getStepIndex(step.status);
        const done = currentIdx > stepIdx && !isRejected;
        const active = currentIdx === stepIdx && !isRejected;
        const pending = currentIdx < stepIdx || isRejected;

        return (
          <div key={step.status} className="flex gap-4">
            {/* Line + dot */}
            <div className="flex flex-col items-center">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10"
                style={{
                  backgroundColor: done
                    ? 'rgba(16,185,129,0.15)'
                    : active
                      ? 'rgba(28,189,255,0.15)'
                      : 'rgba(255,255,255,0.05)',
                  border: done
                    ? '1px solid rgba(16,185,129,0.40)'
                    : active
                      ? '1px solid rgba(28,189,255,0.40)'
                      : '1px solid rgba(255,255,255,0.08)',
                }}
              >
                {done
                  ? <CheckCircle weight="fill" className="w-4 h-4" style={{ color: '#10B981' }} />
                  : active
                    ? <Spinner className="w-3.5 h-3.5 animate-spin" style={{ color: 'var(--glc-blue)' }} />
                    : <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.15)' }} />}
              </div>
              {i < STEPS.length - 1 && (
                <div
                  className="w-px flex-1 my-0.5"
                  style={{
                    background: done ? 'rgba(16,185,129,0.30)' : 'rgba(255,255,255,0.06)',
                    minHeight: 20,
                  }}
                />
              )}
            </div>

            {/* Content */}
            <div className="pb-5">
              <div
                className="text-sm font-medium"
                style={{
                  color: done ? '#10B981' : active ? '#fff' : 'rgba(255,255,255,0.25)',
                }}
              >
                {step.label}
              </div>
              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
                {active ? step.description : (done ? 'Complete' : 'Pending')}
              </div>
            </div>
          </div>
        );
      })}

      {/* Rejected state */}
      {isRejected && (
        <div className="flex gap-4">
          <div className="flex flex-col items-center">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(239,68,68,0.10)', border: '1px solid rgba(239,68,68,0.30)' }}
            >
              <XCircle weight="fill" className="w-4 h-4" style={{ color: '#EF4444' }} />
            </div>
          </div>
          <div>
            <div className="text-sm font-medium" style={{ color: '#EF4444' }}>Request Rejected</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 2 }}>
              See the consultant note below for details.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ClientAuditView() {
  const { id } = useParams<{ id: string }>();
  const [request, setRequest] = useState<AuditRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    api.getAuditRequest(id)
      .then(setRequest)
      .catch(err => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-refresh while running
  useEffect(() => {
    if (!request || !['submitted', 'under_review', 'approved', 'running'].includes(request.status)) return;

    const interval = setInterval(() => {
      if (!id) return;
      api.getAuditRequest(id).then(setRequest).catch(() => {/* silent */});
    }, 10_000);

    return () => clearInterval(interval);
  }, [id, request?.status]);

  const domain = request ? (() => { try { return new URL(request.url).hostname; } catch { return request.url; } })() : '';

  return (
    <AppShell
      title={domain || 'Audit Status'}
      subtitle="Track the progress of your audit"
      actions={
        <Link
          to="/portal"
          className="flex items-center gap-1.5 text-sm no-underline"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Portal
        </Link>
      }
    >
      <div className="px-7 py-6 max-w-2xl mx-auto">

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

        {!loading && request && (
          <div className="space-y-5">

            {/* Summary card */}
            <div
              className="rounded-xl px-5 py-4"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div
                    className="font-semibold"
                    style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}
                  >
                    {domain}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Globe className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{request.url}</span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium"
                    style={{
                      backgroundColor: 'rgba(28,189,255,0.08)',
                      color: 'var(--glc-blue)',
                      border: '1px solid rgba(28,189,255,0.20)',
                    }}
                  >
                    {request.product_mode === 'full' ? 'Full Audit' : 'Express'}
                  </span>
                  {request.industry && (
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {request.industry}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Progress timeline */}
            <div
              className="rounded-xl px-5 py-5"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            >
              <h3
                className="font-semibold mb-5"
                style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
              >
                Progress
              </h3>
              <StepTimeline status={request.status} />
            </div>

            {/* Consultant note */}
            {request.consultant_note && (
              <div
                className="rounded-xl px-5 py-4"
                style={{
                  backgroundColor: request.status === 'rejected'
                    ? 'rgba(239,68,68,0.05)'
                    : 'rgba(28,189,255,0.05)',
                  border: request.status === 'rejected'
                    ? '1px solid rgba(239,68,68,0.20)'
                    : '1px solid rgba(28,189,255,0.15)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <ChatCircle
                    className="w-4 h-4"
                    style={{ color: request.status === 'rejected' ? '#EF4444' : 'var(--glc-blue)' }}
                  />
                  <span
                    className="text-sm font-medium"
                    style={{ color: request.status === 'rejected' ? '#EF4444' : 'var(--glc-blue)' }}
                  >
                    Consultant note
                  </span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  {request.consultant_note}
                </p>
              </div>
            )}

            {/* Delivered: link to report */}
            {request.status === 'delivered' && request.audit_id && (
              <Link
                to={`/reports/${request.audit_id}`}
                className="flex items-center justify-between px-5 py-4 rounded-xl no-underline transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(28,189,255,0.15) 0%, rgba(28,189,255,0.06) 100%)',
                  border: '1px solid rgba(28,189,255,0.25)',
                }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" style={{ color: 'var(--glc-blue)' }} />
                  <div>
                    <div className="font-medium text-sm" style={{ color: '#fff' }}>View Your Report</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      Your audit is complete and ready to review
                    </div>
                  </div>
                </div>
                <CheckCircle weight="fill" className="w-5 h-5" style={{ color: '#10B981' }} />
              </Link>
            )}

            {/* Running: show pipeline monitor link */}
            {request.status === 'running' && request.audit_id && (
              <Link
                to={`/pipeline/${request.audit_id}`}
                className="flex items-center justify-between px-5 py-4 rounded-xl no-underline"
                style={{
                  backgroundColor: 'rgba(28,189,255,0.05)',
                  border: '1px solid rgba(28,189,255,0.15)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Pulse className="w-5 h-5" style={{ color: 'var(--glc-blue)' }} />
                  <div>
                    <div className="font-medium text-sm" style={{ color: '#fff' }}>Audit in progress</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      You'll be notified when it's ready
                    </div>
                  </div>
                </div>
                <Spinner className="w-4 h-4 animate-spin" style={{ color: 'var(--glc-blue)' }} />
              </Link>
            )}

          </div>
        )}
      </div>
    </AppShell>
  );
}
