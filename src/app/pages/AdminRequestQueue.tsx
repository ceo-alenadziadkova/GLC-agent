import { useState, useCallback, useEffect, type CSSProperties } from 'react';
import { GLC_AUDITS_AND_AUDIT_REQUESTS_LIST } from '@glc/route-limits';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router';
import {
  ClipboardText, Clock, CheckCircle, XCircle, Spinner,
  ArrowRight, Warning, Tray, CaretDown, Copy, Code,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { api } from '../data/apiService';
import type { AuditRequest, AuditRequestStatus } from '../data/auditTypes';
import { glcKeys } from '../lib/glc-keys';
import { isNoPublicWebsiteUrl } from '../data/no-public-website';
import {
  INTAKE_IDENTITY_BRIEF_QUESTIONS,
  PRE_BRIEF_QUESTION_IDS,
  countPreBriefSatisfied,
  formatBriefAnswerSummary,
  getPreBriefSubmitSlotIds,
  type BriefResponses,
  type BriefResponseEntry,
  type BriefQuestion,
} from '../data/briefQuestions';
import { getQuestionLabel } from '../lib/intake-question-lookup';
import { UI_FEEDBACK_FLASH_MS } from '../config/ui-feedback-defaults';
import {
  ADMIN_REQUEST_QUEUE_CHROME,
  ADMIN_REQUEST_QUEUE_COPY,
  ADMIN_REQUEST_QUEUE_STATUS,
} from '../config/admin-request-queue-copy.en';
import { UI_SEMANTIC_COLORS } from '../config/ui-semantic-colors';

type IntakeSubmissionRow = Awaited<ReturnType<typeof api.listIntakeSubmissions>>['submissions'][number];

type AdminQueuePayload = {
  requests: AuditRequest[];
  auditRequestsTotal: number;
  auditRequestsLimit: number;
  auditRequestsOffset: number;
  intakeSubmissions: IntakeSubmissionRow[];
  intakeLoadErrorT: string | null;
};

function normalizeIntakeResponses(raw: Record<string, unknown>): BriefResponses {
  const out: BriefResponses = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
      out[k] = { value: (v as BriefResponseEntry).value, source: (v as BriefResponseEntry).source };
    } else {
      out[k] = { value: v as BriefResponseEntry['value'], source: 'client' };
    }
  }
  return out;
}

const ORDERED_PRE_BRIEF = [
  ...INTAKE_IDENTITY_BRIEF_QUESTIONS,
  ...PRE_BRIEF_QUESTION_IDS.map(id => ({
    id,
    question: getQuestionLabel(id),
    priority: 'required',
    type: 'free_text',
    domains: ['all'],
  } as BriefQuestion)),
];

function StatusBadge({ status }: { status: AuditRequestStatus }) {
  const { label, color } = ADMIN_REQUEST_QUEUE_STATUS[status] ?? ADMIN_REQUEST_QUEUE_STATUS.draft;
  return (
    <span className="text-xs font-medium" style={{ color }}>{label}</span>
  );
}

export function AdminRequestQueue() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending'>('pending');
  const [auditReqOffset, setAuditReqOffset] = useState(0);

  useEffect(() => {
    setAuditReqOffset(0);
  }, [filter]);

  const q = useQuery({
    queryKey: glcKeys.adminRequestQueue(filter, auditReqOffset),
    queryFn: async (): Promise<AdminQueuePayload> => {
      let intakeLoadErrorT: string | null = null;
      const { defaultLimit, maxLimit } = GLC_AUDITS_AND_AUDIT_REQUESTS_LIST;
      const reqLimit = filter === 'pending' ? maxLimit : defaultLimit;
      const reqOffset = filter === 'pending' ? 0 : auditReqOffset;
      const reqRes = await api.listAuditRequests(reqLimit, reqOffset);
      const intakeRes = await api.listIntakeSubmissions().catch((e) => {
        intakeLoadErrorT = (e as Error).message;
        return { submissions: [] as IntakeSubmissionRow[] };
      });
      return {
        requests: reqRes.data,
        auditRequestsTotal: reqRes.total,
        auditRequestsLimit: reqRes.limit,
        auditRequestsOffset: reqRes.offset,
        intakeSubmissions: intakeRes.submissions,
        intakeLoadErrorT,
      };
    },
    staleTime: 300_000,
  });

  const requests = q.data?.requests ?? [];
  const auditReqTotal = q.data?.auditRequestsTotal ?? 0;
  const auditReqLimit = q.data?.auditRequestsLimit ?? GLC_AUDITS_AND_AUDIT_REQUESTS_LIST.defaultLimit;
  const auditReqPageOffset = q.data?.auditRequestsOffset ?? 0;
  const intakeSubmissions = q.data?.intakeSubmissions ?? [];
  const intakeLoadError = q.data?.intakeLoadErrorT ?? null;
  const loading = q.isPending && !q.data;
  const fetchError = q.error ? (q.error as Error).message : null;

  const [actionError, setActionError] = useState<string | null>(null);
  const error = actionError ?? fetchError;
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState<{ id: string; text: string } | null>(null);
  const [expandedIntakeToken, setExpandedIntakeToken] = useState<string | null>(null);
  const [copiedIntakeUrl, setCopiedIntakeUrl] = useState<string | null>(null);

  const refetchQueue = useCallback(() => {
    setActionError(null);
    void queryClient.invalidateQueries({ queryKey: glcKeys.adminRequestQueueRoot });
  }, [queryClient]);

  const pending = (s: AuditRequestStatus) => s === 'submitted' || s === 'under_review';

  const pendingRequestsList = requests.filter(r => pending(r.status));

  const visible = filter === 'pending'
    ? pendingRequestsList
    : requests;

  const showAuditRequestsPagination =
    filter === 'all' && auditReqTotal > auditReqLimit;
  const rangeFrom = auditReqTotal === 0 ? 0 : auditReqPageOffset + 1;
  const rangeTo = Math.min(auditReqPageOffset + requests.length, auditReqTotal);

  type QueueRow =
    | { kind: 'request'; req: AuditRequest; at: number }
    | { kind: 'intake'; s: IntakeSubmissionRow; at: number };

  const awaitingRows: QueueRow[] = filter === 'pending'
    ? [
        ...pendingRequestsList.map(req => ({
          kind: 'request' as const,
          req,
          at: new Date(req.created_at).getTime(),
        })),
        ...intakeSubmissions.map(s => ({
          kind: 'intake' as const,
          s,
          at: new Date(s.submitted_at).getTime(),
        })),
      ].sort((a, b) => b.at - a.at)
    : [];

  async function approve(id: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await api.approveAuditRequest(id);
      refetchQueue();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string, note: string) {
    setBusyId(id);
    setActionError(null);
    try {
      await api.rejectAuditRequest(id, note || undefined);
      setRejectNote(null);
      refetchQueue();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <AppShell
      title={ADMIN_REQUEST_QUEUE_COPY.pageTitle}
      subtitle={ADMIN_REQUEST_QUEUE_COPY.pageSubtitle}
      actions={
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:w-auto">
          <Link to="/admin/snapshots" className="glc-btn-secondary no-underline text-sm glc-touch-target sm:min-h-0 sm:min-w-0 justify-center">
            {ADMIN_REQUEST_QUEUE_COPY.navSnapshots}
          </Link>
          <Link to="/admin/discovery" className="glc-btn-secondary no-underline text-sm glc-touch-target sm:min-h-0 sm:min-w-0 justify-center">
            {ADMIN_REQUEST_QUEUE_COPY.navDiscovery}
          </Link>
          <Link to="/portfolio" className="glc-btn-secondary no-underline text-sm glc-touch-target sm:min-h-0 sm:min-w-0 justify-center">
            {ADMIN_REQUEST_QUEUE_COPY.navPortfolio}
          </Link>
        </div>
      }
    >
      <div className="glc-page-content max-w-4xl mx-auto space-y-4">

        <div className="flex flex-wrap gap-2">
          {(['pending', 'all'] as const).map(f => (
            <button
              key={f}
              type="button"
              className="px-3 py-2 rounded-lg text-xs font-medium transition-colors glc-touch-target sm:min-h-0 sm:px-3 sm:py-1.5"
              style={{
                background: filter === f ? ADMIN_REQUEST_QUEUE_CHROME.filterActiveBackground : 'var(--bg-surface)',
                border: `1px solid ${filter === f ? ADMIN_REQUEST_QUEUE_CHROME.filterActiveBorder : 'var(--border-subtle)'}`,
                color: filter === f ? 'var(--glc-blue)' : 'var(--text-secondary)',
              }}
              onClick={() => setFilter(f)}
            >
              {f === 'pending' ? ADMIN_REQUEST_QUEUE_COPY.filterAwaiting : ADMIN_REQUEST_QUEUE_COPY.filterAll}
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
            style={{
              backgroundColor: ADMIN_REQUEST_QUEUE_CHROME.errorPanelBackground,
              border: `1px solid ${ADMIN_REQUEST_QUEUE_CHROME.errorPanelBorder}`,
              color: ADMIN_REQUEST_QUEUE_CHROME.errorText,
            }}
          >
            <Warning className="w-4 h-4 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {!loading && !error && (filter === 'pending' ? awaitingRows.length === 0 : visible.length === 0) && (
          <div className="text-center py-16" style={{ color: 'var(--text-tertiary)' }}>
            <Tray className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-quaternary)' }} />
            <p className="text-sm font-medium">
              {filter === 'pending' ? ADMIN_REQUEST_QUEUE_COPY.emptyAwaiting : ADMIN_REQUEST_QUEUE_COPY.emptyAll}
            </p>
          </div>
        )}

        {!loading && !error && filter === 'pending' && awaitingRows.length > 0 && (
          <section className="space-y-3">
            {intakeLoadError && (
              <p className="text-xs" style={{ color: 'var(--score-2)' }}>
                {ADMIN_REQUEST_QUEUE_COPY.preBriefListUnavailablePrefix} {intakeLoadError}
              </p>
            )}
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between flex-wrap">
              <h2 className="text-sm font-semibold m-0" style={{ color: 'var(--text-primary)' }}>
                {ADMIN_REQUEST_QUEUE_COPY.awaitingSectionTitle}
              </h2>
              <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
                {awaitingRows.length} total
                {' — '}
                {awaitingRows.filter(r => r.kind === 'request').length} audit request(s)
                {', '}
                {awaitingRows.filter(r => r.kind === 'intake').length} client pre-brief(s)
                . Sorted newest first.
              </p>
            </div>
            <div className="space-y-3">
              {awaitingRows.map(row => {
                if (row.kind === 'request') {
                  const req = row.req;
                  const domain = isNoPublicWebsiteUrl(req.url)
                    ? 'No public website'
                    : (() => { try { return new URL(req.url).hostname; } catch { return req.url; } })();
                  const industryOtherSpec = typeof req.brief_snapshot?.intake_industry_specify === 'string'
                    ? req.brief_snapshot.intake_industry_specify.trim()
                    : '';
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
                            <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-quaternary)' }}>
                              Audit request
                            </div>
                            <div className="font-medium truncate" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                              {domain}
                            </div>
                            <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                              {date} · {req.product_mode === 'full' ? 'Complete' : 'Pro'} · client {req.client_id?.slice(0, 8) ?? '—'}…
                              {req.industry ? ` · ${req.industry}` : ''}
                            </div>
                            {req.industry === 'Other' && industryOtherSpec && (
                              <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
                                Sector: {industryOtherSpec}
                              </p>
                            )}
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
                              background: UI_SEMANTIC_COLORS.successMutedBg12,
                              color: UI_SEMANTIC_COLORS.success,
                              border: UI_SEMANTIC_COLORS.successBorder25,
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
                                  style={{ background: UI_SEMANTIC_COLORS.dangerMutedBg12, color: UI_SEMANTIC_COLORS.danger }}
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
                                background: UI_SEMANTIC_COLORS.dangerMutedBg,
                                color: UI_SEMANTIC_COLORS.danger,
                                border: UI_SEMANTIC_COLORS.dangerBorder20,
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
                }

                const s = row.s;
                const meta = s.metadata as Record<string, string | undefined>;
                const title = (meta.company_name as string | undefined)?.trim() || 'Client pre-brief';
                const submitted = new Date(s.submitted_at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
                const expired = Date.now() > new Date(s.expires_at).getTime();
                const open = expandedIntakeToken === s.token;
                const norm = normalizeIntakeResponses(s.responses);

                return (
                  <div
                    key={`intake-${s.token}`}
                    className="rounded-xl overflow-hidden"
                    style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-surface)' }}
                  >
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                      style={{ background: open ? 'var(--bg-inset)' : 'transparent', cursor: 'pointer' }}
                      onClick={() => setExpandedIntakeToken(open ? null : s.token)}
                    >
                      <CaretDown className="w-4 h-4 shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : 'none', color: 'var(--text-tertiary)' }} />
                      <div className="min-w-0 flex-1">
                        <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-quaternary)' }}>
                          Client pre-brief
                        </div>
                        <div className="font-medium text-sm truncate" style={{ color: 'var(--text-primary)' }}>{title}</div>
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                          {ADMIN_REQUEST_QUEUE_COPY.intakeSummaryLine(
                            countPreBriefSatisfied(norm),
                            getPreBriefSubmitSlotIds(norm).length,
                            s.audit_id,
                            expired,
                          )}
                        </div>
                        <div className="text-xs mt-0.5 flex flex-wrap gap-x-2 gap-y-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {submitted}
                          </span>
                          {expired && <span style={{ color: 'var(--score-2)' }}>Link expired</span>}
                          {s.audit_id ? (
                            <Link to={`/audit/${s.audit_id}`} className="no-underline font-medium" style={{ color: 'var(--glc-blue)' }} onClick={e => e.stopPropagation()}>
                              Linked audit
                            </Link>
                          ) : (
                            <span>Not linked to an audit yet</span>
                          )}
                        </div>
                      </div>
                    </button>
                    {open && (
                      <div className="px-4 pb-4 pt-0 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                        <div className="flex flex-wrap gap-2 pt-3">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium"
                            style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', cursor: 'pointer' }}
                            onClick={() => {
                              void navigator.clipboard.writeText(s.intake_url).then(() => {
                                setCopiedIntakeUrl(s.token);
                                window.setTimeout(() => setCopiedIntakeUrl(null), UI_FEEDBACK_FLASH_MS);
                              });
                            }}
                          >
                            <Copy className="w-3.5 h-3.5" />
                            {copiedIntakeUrl === s.token ? 'Copied' : 'Copy client link'}
                          </button>
                          <Link
                            to={`/audit/new?intake=${encodeURIComponent(s.token)}`}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium no-underline"
                            style={{ border: '1px solid rgba(28,189,255,0.35)', color: 'var(--glc-blue)' }}
                          >
                            New Audit with this prefill <ArrowRight className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                        <div className="rounded-lg p-3 space-y-2" style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                          <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-quaternary)' }}>Answers</p>
                          <dl className="space-y-2 m-0">
                            {ORDERED_PRE_BRIEF.map(q => (
                              <div key={q.id}>
                                <dt className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{q.question}</dt>
                                <dd className="text-sm m-0 mt-0.5" style={{ color: 'var(--text-primary)' }}>{formatBriefAnswerSummary(q, norm[q.id])}</dd>
                              </div>
                            ))}
                          </dl>
                        </div>
                        <details className="rounded-lg text-xs" style={{ border: '1px solid var(--border-subtle)' }}>
                          <summary className="px-3 py-2 cursor-pointer flex items-center gap-2 font-medium" style={{ color: 'var(--text-secondary)', listStyle: 'none' } as CSSProperties}>
                            <Code className="w-3.5 h-3.5" />
                            Raw responses (JSON)
                          </summary>
                          <pre
                            className="m-0 p-3 overflow-x-auto max-h-64 overflow-y-auto text-[11px] leading-relaxed"
                            style={{ background: 'var(--bg-canvas)', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-subtle)' }}
                          >
                            {JSON.stringify(s.responses, null, 2)}
                          </pre>
                        </details>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {!loading && !error && filter === 'all' && visible.length > 0 && (
          <div className="space-y-3">
            {visible.map(req => {
              const domain = isNoPublicWebsiteUrl(req.url)
                ? 'No public website'
                : (() => { try { return new URL(req.url).hostname; } catch { return req.url; } })();
              const industryOtherSpec = typeof req.brief_snapshot?.intake_industry_specify === 'string'
                ? req.brief_snapshot.intake_industry_specify.trim()
                : '';
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
                        {req.industry === 'Other' && industryOtherSpec && (
                          <p className="text-xs mt-1 m-0" style={{ color: 'var(--text-secondary)' }}>
                            Sector: {industryOtherSpec}
                          </p>
                        )}
                        <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                          {date} · {req.product_mode === 'full' ? 'Complete' : 'Pro'} · client {req.client_id?.slice(0, 8) ?? '—'}…
                          {req.industry ? ` · ${req.industry}` : ''}
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
                          background: UI_SEMANTIC_COLORS.successMutedBg12,
                          color: UI_SEMANTIC_COLORS.success,
                          border: UI_SEMANTIC_COLORS.successBorder25,
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
                              style={{ background: UI_SEMANTIC_COLORS.dangerMutedBg12, color: UI_SEMANTIC_COLORS.danger }}
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
                            background: UI_SEMANTIC_COLORS.dangerMutedBg,
                            color: UI_SEMANTIC_COLORS.danger,
                            border: UI_SEMANTIC_COLORS.dangerBorder20,
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

        {!loading && !error && filter === 'all' && showAuditRequestsPagination && (
          <nav
            className="flex flex-wrap items-center justify-between gap-3 border-t pt-4"
            style={{ borderColor: 'var(--border-subtle)' }}
            aria-label={ADMIN_REQUEST_QUEUE_COPY.auditRequestsPaginationLabel}
          >
            <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
              {ADMIN_REQUEST_QUEUE_COPY.paginationRange(rangeFrom, rangeTo, auditReqTotal)}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="px-3 py-2 rounded-lg text-xs font-medium glc-touch-target sm:min-h-0 sm:py-1.5"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  opacity: auditReqPageOffset <= 0 ? 0.45 : 1,
                }}
                disabled={auditReqPageOffset <= 0}
                onClick={() => setAuditReqOffset(o => Math.max(0, o - auditReqLimit))}
              >
                {ADMIN_REQUEST_QUEUE_COPY.paginationPrev}
              </button>
              <button
                type="button"
                className="px-3 py-2 rounded-lg text-xs font-medium glc-touch-target sm:min-h-0 sm:py-1.5"
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                  opacity: auditReqPageOffset + auditReqLimit >= auditReqTotal ? 0.45 : 1,
                }}
                disabled={auditReqPageOffset + auditReqLimit >= auditReqTotal}
                onClick={() => setAuditReqOffset(o => o + auditReqLimit)}
              >
                {ADMIN_REQUEST_QUEUE_COPY.paginationNext}
              </button>
            </div>
          </nav>
        )}
      </div>
    </AppShell>
  );
}
