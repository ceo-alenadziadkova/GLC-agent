import { useState, useEffect, useMemo } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import {
  CheckCircle, Spinner, Warning,
  ArrowLeft, Pulse, FileText, Globe, ClipboardText, Circle, Rocket, ChatCircleDots, CaretRight,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { api, ApiError } from '../data/apiService';
import type { AuditState } from '../data/auditTypes';
import { formatAuditWebsiteDisplay, isNoPublicWebsiteUrl } from '../data/no-public-website';
import { effectiveBriefForPipelineGates } from '../data/intakeBriefMap';
import {
  countAnswered,
  mergeBriefResponsesPreferFilled,
  pipelineRequiredIdsForProductMode,
  type BriefResponses,
} from '../data/briefQuestions';
import { useIntakeBankMetrics } from '../hooks/useIntakeWizard';
import { useBriefLayoutPrefsSync } from '../hooks/useBriefLayoutPrefsSync';
import { IntakeBankCoverageHint } from '../components/IntakeBankCoverageHint';
import { IntakeBankWizard } from '../components/IntakeBankWizard';
import { BankClassicBriefFields } from '../components/BankClassicBriefFields';
import { BriefLayoutPreferenceCards } from '../components/BriefLayoutPreferenceCards';
import {
  CLIENT_BRIEF_LAYOUT_DEFAULT_KEY,
  clientBriefLayoutStorageKey,
  resolveClientBriefLayout,
  writeClientBriefLayout,
  clearClientBriefLayout,
} from '../lib/client-brief-layout-preference';

// ── Inline brief form ────────────────────────────────────────────────────────

function ClientBriefSection({ auditId, onBriefSaved }: { auditId: string; onBriefSaved?: () => void }) {
  const [responses, setResponses] = useState<BriefResponses>({});
  const [intakeProgress, setIntakeProgress] = useState<{ progressPct: number; readinessBadge: 'low' | 'medium' | 'high'; nextBestAction: string } | null>(null);
  const [missingRecommendedCount, setMissingRecommendedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [bankCollectionMode, setBankCollectionMode] = useState<'discovery' | undefined>(undefined);
  const [productMode, setProductMode] = useState<'full' | 'express'>('full');
  const [briefLayoutChoice, setBriefLayoutChoice] = useState<'unset' | 'classic' | 'wizard'>(() =>
    resolveClientBriefLayout(auditId) ?? 'unset',
  );

  useEffect(() => {
    setBriefLayoutChoice(resolveClientBriefLayout(auditId) ?? 'unset');
  }, [auditId]);

  const layoutSyncKeys = useMemo(
    () => [CLIENT_BRIEF_LAYOUT_DEFAULT_KEY, clientBriefLayoutStorageKey(auditId)],
    [auditId],
  );

  useBriefLayoutPrefsSync(layoutSyncKeys, () => {
    setBriefLayoutChoice(resolveClientBriefLayout(auditId) ?? 'unset');
  });

  useEffect(() => {
    api.getBrief(auditId)
      .then(data => {
        if (data.brief?.responses) {
          setResponses(data.brief.responses as BriefResponses);
        }
        setBankCollectionMode(data.brief?.collection_mode === 'discovery' ? 'discovery' : undefined);
        if (data.product_mode === 'express') setProductMode('express');
        else setProductMode('full');
        if (data.intakeProgress) setIntakeProgress(data.intakeProgress);
        if (data.gates?.recommendedToImproveIds) setMissingRecommendedCount(data.gates.recommendedToImproveIds.length);
      })
      .catch(() => {/* Brief may not exist yet — that's OK */})
      .finally(() => setLoading(false));
  }, [auditId]);

  const pipelineRequiredIds = pipelineRequiredIdsForProductMode(productMode);
  const effectiveBriefForGates = useMemo(
    () => effectiveBriefForPipelineGates(responses),
    [responses],
  );
  const answeredRequired = countAnswered(effectiveBriefForGates, [...pipelineRequiredIds]);
  const pipelineRequiredTotal = pipelineRequiredIds.length;
  const fallbackProgress = Math.min(
    100,
    Math.round((answeredRequired / Math.max(1, pipelineRequiredTotal)) * 100),
  );
  const progressPct = intakeProgress?.progressPct ?? fallbackProgress;
  const readinessBadge = intakeProgress?.readinessBadge ?? (fallbackProgress >= 80 ? 'high' : fallbackProgress >= 45 ? 'medium' : 'low');
  const bankMetrics = useIntakeBankMetrics(responses, bankCollectionMode);

  function handleSelectBriefLayout(mode: 'classic' | 'wizard') {
    writeClientBriefLayout(auditId, mode);
    setBriefLayoutChoice(mode);
  }

  function handleChangeBriefLayout() {
    clearClientBriefLayout(auditId);
    setBriefLayoutChoice('unset');
  }

  function handleClientBriefFieldChange(qid: string, value: string | string[] | number | null) {
    setResponses(prev => ({ ...prev, [qid]: { value, source: 'client' } }));
  }

  function handleClientBriefSetUnknown(qid: string) {
    setResponses(prev => ({ ...prev, [qid]: { value: null, source: 'unknown' } }));
  }

  async function handleSave() {
    setSaving(true);
    setBriefError(null);
    setSaved(false);
    try {
      await api.saveBrief(auditId, responses as Record<string, unknown>);
      const refreshed = await api.getBrief(auditId);
      if (refreshed.product_mode === 'express') setProductMode('express');
      else setProductMode('full');
      if (refreshed.intakeProgress) setIntakeProgress(refreshed.intakeProgress);
      if (refreshed.gates?.recommendedToImproveIds) setMissingRecommendedCount(refreshed.gates.recommendedToImproveIds.length);
      setSaved(true);
      onBriefSaved?.();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setBriefError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return null;

  const layoutSelected = briefLayoutChoice === 'classic' || briefLayoutChoice === 'wizard';

  return (
    <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      {/* Header */}
      <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <div className="flex items-center gap-2.5">
          <ClipboardText className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Pre-Audit Brief</h3>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {layoutSelected && (
            <button
              type="button"
              onClick={handleChangeBriefLayout}
              className="text-xs font-medium underline-offset-2 hover:underline"
              style={{ color: 'var(--glc-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Change layout
            </button>
          )}
          {layoutSelected && (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {answeredRequired} / {pipelineRequiredTotal} required answered
            </span>
          )}
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">
        <p className="text-xs leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
          Set your default brief layout anytime in{' '}
          <Link
            to="/settings#brief-layout"
            className="font-medium underline-offset-2 hover:underline"
            style={{ color: 'var(--glc-blue)' }}
          >
            Settings
          </Link>
          . Per-audit layout below overrides that default.
        </p>
        {!layoutSelected && (
          <BriefLayoutPreferenceCards
            selected={null}
            onSelect={handleSelectBriefLayout}
          />
        )}

        {layoutSelected && (
          <>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Audit readiness: {progressPct}%</span>
              <span className="px-2 py-0.5 rounded text-xs" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                {readinessBadge.toUpperCase()}
              </span>
            </div>
            <div className="rounded-full overflow-hidden" style={{ height: 3, backgroundColor: 'var(--bg-muted)' }}>
              <div className="h-full rounded-full" style={{ width: `${progressPct}%`, background: 'var(--gradient-brand)', transition: 'width 0.3s' }} />
            </div>

            <IntakeBankCoverageHint
              dataQualityPct={bankMetrics.dataQualityPct}
              visibleRequiredAnswered={bankMetrics.visibleRequiredAnswered}
              visibleRequiredTotal={bankMetrics.visibleRequiredTotal}
              visibleRecommendedAnswered={bankMetrics.visibleRecommendedAnswered}
              visibleRecommendedTotal={bankMetrics.visibleRecommendedTotal}
            />

            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              These answers help the GLC team tailor the audit. Fill{' '}
              <span className="inline-flex items-center gap-0.5" style={{ color: '#EF4444' }}>
                <Circle size={6} weight="fill" />
                required
              </span>{' '}
              questions before the audit starts.
            </p>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              Want to improve audit quality? Answer {missingRecommendedCount} more recommended question(s).
            </p>

            <div className="max-h-[55vh] overflow-y-auto pr-1">
              {briefLayoutChoice === 'wizard' ? (
                <IntakeBankWizard
                  responses={responses}
                  onResponsesChange={patch =>
                    setResponses(prev => mergeBriefResponsesPreferFilled(prev, patch))
                  }
                  interviewMode={false}
                  emphasizeClientSource={false}
                  answerSource="client"
                  collectionMode={bankCollectionMode}
                />
              ) : (
                <BankClassicBriefFields
                  compact
                  responses={responses}
                  collectionMode={bankCollectionMode}
                  onChange={handleClientBriefFieldChange}
                  onSetUnknown={handleClientBriefSetUnknown}
                  interviewMode={false}
                  emphasizeClientSource={false}
                />
              )}
            </div>

            {briefError && (
              <div className="flex items-center gap-2 text-xs px-3 py-2 rounded" style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#EF4444' }}>
                <Warning className="w-3.5 h-3.5" />{briefError}
              </div>
            )}

            <button type="button" onClick={handleSave} disabled={saving}
              className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
              style={{ background: 'var(--gradient-brand)', color: 'var(--glc-ink)', cursor: saving ? 'not-allowed' : 'pointer', boxShadow: 'var(--glow-blue-sm)' }}
            >
              {saving
                ? <><Spinner className="w-3.5 h-3.5 animate-spin" /> Saving...</>
                : saved
                  ? <><CheckCircle weight="fill" className="w-3.5 h-3.5" /> Saved!</>
                  : 'Save Brief'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Self-serve audit (by audits.id) ───────────────────────────────────────────

function ClientPortalAuditById({ auditId }: { auditId: string }) {
  const navigate = useNavigate();
  const [auditState, setAuditState] = useState<AuditState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [briefRefresh, setBriefRefresh] = useState(0);
  const [gatePayload, setGatePayload] = useState<{
    product_mode: 'full' | 'express';
    canStartExpress: boolean;
    canStartFull: boolean;
  } | null>(null);
  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpOk, setHelpOk] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    api.getAudit(auditId)
      .then(data => {
        if (!cancel) {
          setAuditState(data);
          setError(null);
        }
      })
      .catch(err => {
        if (!cancel) setError((err as Error).message);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [auditId]);

  const auditStatus = auditState?.meta.status;
  const isCreated = auditStatus === 'created';

  useEffect(() => {
    if (auditStatus !== 'created') {
      setGatePayload(null);
      return;
    }
    let cancel = false;
    api.getBrief(auditId)
      .then(d => {
        if (cancel) return;
        const pm = d.product_mode === 'express' ? 'express' : 'full';
        setGatePayload({
          product_mode: pm,
          canStartExpress: Boolean(d.gates?.canStartExpress),
          canStartFull: Boolean(d.gates?.canStartFull),
        });
      })
      .catch(() => {
        if (!cancel) setGatePayload(null);
      });
    return () => {
      cancel = true;
    };
  }, [auditId, auditStatus, briefRefresh]);

  const domain = auditState
    ? (isNoPublicWebsiteUrl(auditState.meta.company_url)
      ? formatAuditWebsiteDisplay(auditState.meta.company_url)
      : (() => {
        try {
          return new URL(auditState.meta.company_url).hostname;
        } catch {
          return auditState.meta.company_url;
        }
      })())
    : '';

  const canStart = gatePayload
    ? (gatePayload.product_mode === 'express' ? gatePayload.canStartExpress : gatePayload.canStartFull)
    : false;

  async function handleStart() {
    setStarting(true);
    setStartError(null);
    try {
      await api.startPipeline(auditId);
      navigate(`/portal/pipeline/${auditId}`);
    } catch (e) {
      setStartError((e as Error).message);
    } finally {
      setStarting(false);
    }
  }

  async function handleHelp() {
    setHelpBusy(true);
    setHelpError(null);
    try {
      await api.requestBriefHelp(auditId, helpMessage);
      setHelpOk(true);
      setHelpMessage('');
    } catch (e) {
      setHelpError((e as Error).message);
    } finally {
      setHelpBusy(false);
    }
  }

  const meta = auditState?.meta;
  const statusLabel = meta?.status.replace(/_/g, ' ') ?? '';

  return (
    <AppShell
      title={domain || 'Your audit'}
      subtitle="Complete your brief, then start the audit when you are ready"
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

        {!loading && auditState && meta && (
          <div className="space-y-5">
            <div
              className="rounded-xl px-5 py-4"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div
                    className="font-semibold"
                    style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}
                  >
                    {domain}
                  </div>
                  {!isNoPublicWebsiteUrl(meta.company_url) && (
                    <div className="flex items-center gap-2 mt-1">
                      <Globe className="w-3.5 h-3.5" style={{ color: 'var(--text-tertiary)' }} />
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{meta.company_url}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                    style={{
                      backgroundColor: 'rgba(28,189,255,0.08)',
                      color: 'var(--glc-blue)',
                      border: '1px solid rgba(28,189,255,0.20)',
                    }}
                  >
                    {meta.product_mode === 'full' ? 'Full Audit' : 'Express'}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{statusLabel}</span>
                </div>
              </div>
            </div>

            {isCreated && (
              <>
                <ClientBriefSection
                  auditId={auditId}
                  onBriefSaved={() => setBriefRefresh(n => n + 1)}
                />

                {startError && (
                  <div
                    className="flex items-center gap-2 text-sm px-4 py-3 rounded-lg"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}
                  >
                    <Warning className="w-4 h-4 flex-shrink-0" />
                    {startError}
                  </div>
                )}

                <div
                  className="rounded-xl px-5 py-4 space-y-3"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Run the audit</div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    When required brief fields are complete, you can start the pipeline. Review gates inside the run are handled by your GLC consultant; you can follow progress here in the portal.
                  </p>
                  <button
                    type="button"
                    onClick={handleStart}
                    disabled={!canStart || starting}
                    className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                    style={{
                      background: canStart && !starting ? 'var(--gradient-brand)' : 'var(--bg-muted)',
                      color: canStart && !starting ? 'var(--glc-ink)' : 'var(--text-quaternary)',
                      cursor: canStart && !starting ? 'pointer' : 'not-allowed',
                      boxShadow: canStart && !starting ? 'var(--glow-blue-sm)' : 'none',
                      border: 'none',
                    }}
                  >
                    {starting
                      ? <><Spinner className="w-3.5 h-3.5 animate-spin" /> Starting...</>
                      : <><Rocket className="w-4 h-4" /> Start audit</>}
                  </button>
                </div>

                <div
                  className="rounded-xl px-5 py-4 space-y-3"
                  style={{ backgroundColor: 'rgba(28,189,255,0.04)', border: '1px solid rgba(28,189,255,0.12)' }}
                >
                  <div className="flex items-center gap-2">
                    <ChatCircleDots className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Request help with the brief</span>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Optional. A consultant can clarify questions or suggest wording. This does not block starting the audit whenever you are ready.
                  </p>
                  <textarea
                    value={helpMessage}
                    onChange={e => setHelpMessage(e.target.value)}
                    placeholder="Add context (optional)"
                    rows={3}
                    className="w-full rounded-lg px-3 py-2 text-sm resize-y min-h-[72px]"
                    style={{
                      backgroundColor: 'var(--bg-muted)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  {helpError && (
                    <div className="text-xs" style={{ color: '#EF4444' }}>{helpError}</div>
                  )}
                  {helpOk && (
                    <div className="flex items-center gap-2 text-xs" style={{ color: '#10B981' }}>
                      <CheckCircle weight="fill" className="w-3.5 h-3.5" />
                      We notified the team. You can still edit the brief or start the audit.
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleHelp}
                    disabled={helpBusy}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      border: '1px solid var(--border-default)',
                      color: 'var(--text-primary)',
                      cursor: helpBusy ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {helpBusy ? 'Sending…' : 'Send help request'}
                  </button>
                </div>
              </>
            )}

            {!isCreated && meta.status === 'completed' && (
              <Link
                to={`/portal/reports/${auditId}`}
                className="flex items-center justify-between px-5 py-4 rounded-xl no-underline transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(28,189,255,0.15) 0%, rgba(28,189,255,0.06) 100%)',
                  border: '1px solid rgba(28,189,255,0.25)',
                }}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5" style={{ color: 'var(--glc-blue)' }} />
                  <div>
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>View your report</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      Your audit run has finished
                    </div>
                  </div>
                </div>
                <CheckCircle weight="fill" className="w-5 h-5" style={{ color: '#10B981' }} />
              </Link>
            )}

            {!isCreated && (
              <Link
                to={`/portal/pipeline/${auditId}`}
                className="flex items-center justify-between px-5 py-4 rounded-xl no-underline"
                style={{
                  backgroundColor: 'rgba(28,189,255,0.05)',
                  border: '1px solid rgba(28,189,255,0.15)',
                }}
              >
                <div className="flex items-center gap-3">
                  <Pulse className="w-5 h-5" style={{ color: 'var(--glc-blue)' }} />
                  <div>
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Pipeline status</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {meta.status === 'completed' ? 'Review phases and logs' : 'Follow live progress'}
                    </div>
                  </div>
                </div>
                <CaretRight className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
              </Link>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function ClientAuditView() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [auditOk, setAuditOk] = useState(false);

  useEffect(() => {
    if (!id) {
      setLoading(false);
      setResolveError('Missing id.');
      setAuditOk(false);
      return;
    }
    let cancel = false;
    setLoading(true);
    setResolveError(null);
    setAuditOk(false);

    api
      .getAudit(id)
      .then(() => {
        if (!cancel) setAuditOk(true);
      })
      .catch((e) => {
        if (cancel) return;
        if (e instanceof ApiError && e.status === 404) {
          setResolveError('We could not find this audit.');
        } else {
          setResolveError((e as Error).message);
        }
        setAuditOk(false);
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });

    return () => {
      cancel = true;
    };
  }, [id]);

  if (!id) {
    return (
      <AppShell title="Portal" subtitle="">
        <div className="px-7 py-6 max-w-2xl mx-auto text-sm" style={{ color: '#EF4444' }}>Missing id.</div>
      </AppShell>
    );
  }

  if (loading) {
    return (
      <AppShell title="Loading" subtitle="">
        <div className="flex items-center justify-center py-20">
          <Spinner className="w-6 h-6 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        </div>
      </AppShell>
    );
  }

  if (auditOk) {
    return <ClientPortalAuditById auditId={id} />;
  }

  return (
    <AppShell
      title="Not found"
      subtitle=""
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
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-lg"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}
        >
          <Warning className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{resolveError ?? 'Not found.'}</span>
        </div>
      </div>
    </AppShell>
  );
}
