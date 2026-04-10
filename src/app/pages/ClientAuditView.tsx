import { useState, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router';
import {
  CheckCircle, Spinner, Warning,
  ArrowLeft, Pulse, FileText, Globe, ClipboardText, Circle, Rocket, ChatCircleDots, CaretRight,
  ChartBar,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { PortalSnapshotAccountMirror } from '../components/PortalSnapshotAccountMirror';
import { useClientPortalPipeline } from '../context/ClientPortalPipelineContext';
import { api } from '../data/apiService';
import type { IntakeBriefCollectionMode } from '../data/auditTypes';
import {
  CLIENT_PORTAL_PRODUCT_MODE_HELP,
  clientCanViewPortalPipeline,
} from '../lib/client-portal-pipeline-access';
import { freeSnapshotPreviewFromAuditState } from '../lib/free-snapshot-preview-from-audit-state';
import { getSnapshotAccessBlockedState } from '../lib/snapshot-diagnostics';
import { formatAuditWebsiteDisplay, isNoPublicWebsiteUrl } from '../data/no-public-website';
import { effectiveBriefForPipelineGates } from '../data/intakeBriefMap';
import {
  countAnswered,
  pipelineRequiredIdsForProductMode,
  type BriefResponses,
} from '../data/briefQuestions';
import { useAudit } from '../hooks/useAudit';
import { useIntakeBankMetrics } from '../hooks/useIntakeWizard';
import { useBriefLayoutPrefsSync } from '../hooks/useBriefLayoutPrefsSync';
import { getGlcQueryClient } from '../lib/glc-query-client';
import { glcKeys } from '../lib/glc-keys';
import { invalidateAuditRelatedQueries } from '../lib/glc-invalidate-queries';
import { IntakeBankCoverageHint } from '../components/IntakeBankCoverageHint';
import { labelsForMissingReportDomains } from '../lib/intake-coverage-domain-labels';
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
  const queryClient = useQueryClient();
  const briefQuery = useQuery({
    queryKey: glcKeys.brief.detail(auditId),
    queryFn: () => api.getBrief(auditId),
    staleTime: 60_000,
  });

  const [responses, setResponses] = useState<BriefResponses>({});
  const [intakeProgress, setIntakeProgress] = useState<{ progressPct: number; readinessBadge: 'low' | 'medium' | 'high'; nextBestAction: string } | null>(null);
  const [missingRecommendedCount, setMissingRecommendedCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [briefError, setBriefError] = useState<string | null>(null);

  const [briefCollectionMode, setBriefCollectionMode] = useState<IntakeBriefCollectionMode | undefined>(undefined);
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
    const data = briefQuery.data;
    if (!data) return;
    if (data.brief?.responses) {
      setResponses(data.brief.responses as BriefResponses);
    }
    setBriefCollectionMode(data.brief?.collection_mode);
    if (data.product_mode === 'express') setProductMode('express');
    else setProductMode('full');
    if (data.intakeProgress) setIntakeProgress(data.intakeProgress);
    if (data.gates?.recommendedToImproveIds) setMissingRecommendedCount(data.gates.recommendedToImproveIds.length);
  }, [briefQuery.data]);

  const effectiveBriefForGates = useMemo(
    () => effectiveBriefForPipelineGates(responses),
    [responses],
  );
  const pipelineRequiredIds = useMemo(
    () =>
      pipelineRequiredIdsForProductMode(
        productMode,
        effectiveBriefForGates,
        briefCollectionMode,
      ),
    [productMode, effectiveBriefForGates, briefCollectionMode],
  );
  const answeredRequired = countAnswered(effectiveBriefForGates, [...pipelineRequiredIds]);
  const pipelineRequiredTotal = pipelineRequiredIds.length;
  const fallbackProgress = Math.min(
    100,
    Math.round((answeredRequired / Math.max(1, pipelineRequiredTotal)) * 100),
  );
  const progressPct = intakeProgress?.progressPct ?? fallbackProgress;
  const readinessBadge = intakeProgress?.readinessBadge ?? (fallbackProgress >= 80 ? 'high' : fallbackProgress >= 45 ? 'medium' : 'low');
  const clientIntakeSurface =
    briefCollectionMode === 'discovery'
      ? undefined
      : briefCollectionMode === 'pre_brief'
        ? 'client_portal'
        : 'client_form';

  const bankMetrics = useIntakeBankMetrics(responses, briefCollectionMode, clientIntakeSurface, productMode);

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
      await api.saveBrief(auditId, responses as Record<string, unknown>, {
        intake_versions: briefQuery.data?.brief?.intake_versions ?? undefined,
      });
      await queryClient.invalidateQueries({ queryKey: glcKeys.brief.detail(auditId) });
      setSaved(true);
      onBriefSaved?.();
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setBriefError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (briefQuery.isPending && !briefQuery.data) return null;

  const layoutSelected = briefLayoutChoice === 'classic' || briefLayoutChoice === 'wizard';

  return (
    <div className="rounded-xl" style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}>
      {/* Header */}
        <div className="px-5 py-4 mobile:px-4 flex items-center justify-between flex-wrap gap-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
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

      <div className="px-5 py-4 mobile:px-4 space-y-4">
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
              reportInputGapLabels={labelsForMissingReportDomains(bankMetrics.missingForReport)}
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

            <div className="max-h-[min(55vh,28rem)] sm:max-h-[55vh] overflow-y-auto pr-1 -mr-1">
              {briefLayoutChoice === 'wizard' ? (
                <IntakeBankWizard
                  responses={responses}
                  onResponsesChange={next => setResponses(next)}
                  interviewMode={false}
                  emphasizeClientSource={false}
                  answerSource="client"
                  collectionMode={briefCollectionMode}
                  intakeSurface={clientIntakeSurface}
                  intakeAnalytics={
                    clientIntakeSurface
                      ? {
                          auditId,
                          surface: clientIntakeSurface,
                          getIntakeVersions: () => briefQuery.data?.brief?.intake_versions ?? null,
                        }
                      : undefined
                  }
                  productMode={productMode}
                />
              ) : (
                <BankClassicBriefFields
                  compact
                  responses={responses}
                  collectionMode={briefCollectionMode}
                  intakeSurface={clientIntakeSurface}
                  productMode={productMode}
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
  const { audit: auditState, loading: auditLoading, error: auditError } = useAudit(auditId);

  const auditStatus = auditState?.meta?.status;
  const isCreated = auditStatus === 'created';

  const briefForGatesQuery = useQuery({
    queryKey: glcKeys.brief.detail(auditId),
    queryFn: () => api.getBrief(auditId),
    enabled: isCreated,
    staleTime: 60_000,
  });

  const gatePayload = useMemo(() => {
    if (!isCreated || !briefForGatesQuery.data) return null;
    const d = briefForGatesQuery.data;
    const pm = d.product_mode === 'express' ? 'express' : 'full';
    return {
      product_mode: pm as 'full' | 'express',
      canStartExpress: Boolean(d.gates?.canStartExpress),
      canStartFull: Boolean(d.gates?.canStartFull),
    };
  }, [isCreated, briefForGatesQuery.data]);

  const loading = auditLoading && !auditState;
  const error = auditError;

  const [startError, setStartError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpOk, setHelpOk] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);
  const [upgradeTarget, setUpgradeTarget] = useState<'express' | 'full'>('express');
  const [upgradeBusy, setUpgradeBusy] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const { setPipelineAccess } = useClientPortalPipeline();

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
      invalidateAuditRelatedQueries(getGlcQueryClient(), auditId);
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
  const statusLabel = meta?.status?.replace(/_/g, ' ') ?? '';
  const isFreeSnapshot = meta?.product_mode === 'free_snapshot';
  const snapshotPreview = useMemo(
    () => (auditState ? freeSnapshotPreviewFromAuditState(auditState) : null),
    [auditState],
  );

  const freeSnapshotAccess = useMemo(
    () => (snapshotPreview ? getSnapshotAccessBlockedState(snapshotPreview) : null),
    [snapshotPreview],
  );

  const canViewPipeline = useMemo(() => {
    if (!meta) return false;
    return clientCanViewPortalPipeline({
      auditMeta: meta,
      brief:
        meta.status === 'created'
          ? gatePayload
            ? {
                product_mode: gatePayload.product_mode,
                gates: {
                  canStartExpress: gatePayload.canStartExpress,
                  canStartFull: gatePayload.canStartFull,
                },
              }
            : null
          : {},
    });
  }, [meta, gatePayload]);

  useEffect(() => {
    if (!meta) {
      setPipelineAccess(auditId, false);
      return;
    }
    setPipelineAccess(auditId, canViewPipeline);
    return () => setPipelineAccess(null, false);
  }, [auditId, meta, canViewPipeline, setPipelineAccess]);

  const portalSubtitle =
    isFreeSnapshot && meta?.status === 'completed'
      ? freeSnapshotAccess?.showCallout
        ? freeSnapshotAccess.robotsLimitedSample
          ? 'Your quick scan is saved. robots.txt blocked the homepage, but we sampled other allowed pages — see the note below. Express or Full can still use your brief and anything you add.'
          : 'Your quick scan is saved, but we could not read the live site automatically (robots policy or a fetch issue). Details are below — Express or Full can still proceed from your brief and materials you add.'
        : 'Your quick scan is saved here — same results as on the snapshot page. Continue below when you want a full Express or Full audit.'
      : 'Complete your brief, then start the audit when you are ready';

  async function handleUpgradeFromSnapshot(useScrapedContext: boolean) {
    setUpgradeBusy(true);
    setUpgradeError(null);
    try {
      await api.upgradeAuditFromSnapshot(auditId, {
        target_mode: upgradeTarget,
        use_scraped_context: useScrapedContext,
      });
      invalidateAuditRelatedQueries(getGlcQueryClient(), auditId);
    } catch (e) {
      setUpgradeError((e as Error).message);
    } finally {
      setUpgradeBusy(false);
    }
  }

  return (
    <AppShell
      title={domain || 'Your audit'}
      subtitle={portalSubtitle}
      actions={
        <Link
          to="/portal"
          className="hidden sm:inline-flex items-center gap-1.5 text-sm no-underline"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Portal
        </Link>
      }
    >
      <div className="glc-page-content max-w-2xl mx-auto space-y-4 mobile:space-y-3">
        <Link
          to="/portal"
          className="sm:hidden inline-flex items-center gap-1.5 text-sm font-medium no-underline glc-touch-target -mt-1"
          style={{ color: 'var(--glc-blue)' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Portal
        </Link>
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
              className="rounded-xl px-5 py-4 mobile:px-4"
              style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <div
                    className="font-semibold break-words"
                    style={{ color: 'var(--text-primary)', fontSize: 'var(--text-base)' }}
                  >
                    {domain}
                  </div>
                  {!isNoPublicWebsiteUrl(meta.company_url) && (
                    <div className="flex items-center gap-2 mt-1 min-w-0">
                      <Globe className="w-3.5 h-3.5 flex-shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                      <span className="break-all" style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{meta.company_url}</span>
                    </div>
                  )}
                </div>
                <div className="flex flex-row sm:flex-col items-center sm:items-end gap-2 sm:gap-1 flex-shrink-0">
                  <span
                    className="px-2 py-0.5 rounded text-xs font-medium capitalize"
                    style={{
                      backgroundColor: 'rgba(28,189,255,0.08)',
                      color: 'var(--glc-blue)',
                      border: '1px solid rgba(28,189,255,0.20)',
                    }}
                  >
                    {meta.product_mode === 'full'
                      ? 'Full audit'
                      : meta.product_mode === 'free_snapshot'
                        ? 'Free snapshot'
                        : 'Express'}
                  </span>
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>{statusLabel}</span>
                </div>
              </div>
            </div>

            {isCreated && (
              <>
                <ClientBriefSection
                  auditId={auditId}
                  onBriefSaved={() => invalidateAuditRelatedQueries(getGlcQueryClient(), auditId)}
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
                  className="rounded-xl px-5 py-4 mobile:px-4 space-y-3"
                  style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Run the audit</div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', lineHeight: 1.5 }}>
                    When required brief fields are complete, you can start the pipeline. Some phases may pause for a review step before continuing; you can follow progress here in the portal.
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
                  className="rounded-xl px-5 py-4 mobile:px-4 space-y-3"
                  style={{ backgroundColor: 'rgba(28,189,255,0.04)', border: '1px solid rgba(28,189,255,0.12)' }}
                >
                  <div className="flex items-center gap-2">
                    <ChatCircleDots className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Request help with the brief</span>
                  </div>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    Optional. You can request help to clarify questions or improve wording. This does not block starting the audit whenever you are ready.
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
                    className="px-4 py-2 rounded-lg text-sm font-medium glc-touch-target"
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

            {!isCreated && meta.status === 'completed' && isFreeSnapshot && (
              <div
                className="rounded-xl overflow-hidden space-y-4 px-5 py-5 mobile:px-4 mobile:py-4"
                style={
                  freeSnapshotAccess?.showCallout
                    ? {
                        border: '1px solid rgba(249,115,22,0.28)',
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.08) 0%, rgba(28,189,255,0.04) 100%)',
                      }
                    : {
                        border: '1px solid rgba(28,189,255,0.22)',
                        background: 'linear-gradient(135deg, rgba(28,189,255,0.10) 0%, rgba(28,189,255,0.03) 100%)',
                      }
                }
              >
                <div className="flex items-start gap-3">
                  <ChartBar className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: 'var(--glc-blue)' }} />
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                      {freeSnapshotAccess?.showCallout
                        ? 'Quick scan saved — automatic read was limited'
                        : 'Quick scan in your account'}
                    </div>
                    <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {freeSnapshotAccess?.showCallout ? (
                        <>
                          Results are kept here after sign-up, but our crawler could not download public HTML for the URL you
                          entered (often robots.txt). Scores below are placeholders. You can{' '}
                          <Link to="/snapshot" className="font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--glc-blue)' }}>
                            run another free check
                          </Link>{' '}
                          with a different allowed URL, or continue to Express / Full and add context in the brief.
                        </>
                      ) : (
                        <>
                          The same preview you saw on the free snapshot page, now saved after registration — it will not
                          disappear when you close the tab. This is still an automated quick read, not the scored multi-phase
                          GLC audit you get after the intake brief.
                        </>
                      )}
                    </p>
                  </div>
                  {freeSnapshotAccess?.showCallout ? (
                    <Warning weight="fill" className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--score-2)' }} />
                  ) : (
                    <CheckCircle weight="fill" className="w-5 h-5 flex-shrink-0" style={{ color: '#10B981' }} />
                  )}
                </div>

                {snapshotPreview ? (
                  <PortalSnapshotAccountMirror result={snapshotPreview} />
                ) : (
                  <p className="text-xs m-0" style={{ color: 'var(--text-quaternary)' }}>
                    We could not load full snapshot fields for this audit. You can still continue with Express or Full below.
                  </p>
                )}

                <div className="space-y-4 border-t pt-4" style={{ borderColor: 'rgba(28,189,255,0.15)' }}>
                  <div>
                    <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-tertiary)' }}>
                      Continue with a full audit — choose type
                    </div>
                    <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: 'var(--border-subtle)' }}>
                      {(['express', 'full'] as const).map(m => (
                        <button
                          key={m}
                          type="button"
                          disabled={upgradeBusy}
                          onClick={() => setUpgradeTarget(m)}
                          className="flex-1 py-2 text-xs font-medium"
                          style={{
                            background:
                              upgradeTarget === m ? 'rgba(28,189,255,0.14)' : 'var(--bg-muted)',
                            color: 'var(--text-primary)',
                            border: 'none',
                            cursor: upgradeBusy ? 'not-allowed' : 'pointer',
                          }}
                        >
                          {m === 'express' ? 'Express' : 'Full'}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs m-0 mt-2 leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                      Selected type applies to the intake brief and pipeline below. You can change it in the brief if your
                      plan allows.
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div
                      className="rounded-lg px-3 py-2.5 text-xs"
                      style={{
                        background: 'var(--bg-surface)',
                        border:
                          upgradeTarget === 'express'
                            ? '1px solid rgba(28,189,255,0.35)'
                            : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {CLIENT_PORTAL_PRODUCT_MODE_HELP.express.label}
                      </div>
                      <p className="m-0 mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {CLIENT_PORTAL_PRODUCT_MODE_HELP.express.summary}
                      </p>
                      <p className="m-0" style={{ color: 'var(--text-quaternary)' }}>
                        {CLIENT_PORTAL_PRODUCT_MODE_HELP.express.detail}
                      </p>
                    </div>
                    <div
                      className="rounded-lg px-3 py-2.5 text-xs"
                      style={{
                        background: 'var(--bg-surface)',
                        border:
                          upgradeTarget === 'full'
                            ? '1px solid rgba(28,189,255,0.35)'
                            : '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                        {CLIENT_PORTAL_PRODUCT_MODE_HELP.full.label}
                      </div>
                      <p className="m-0 mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                        {CLIENT_PORTAL_PRODUCT_MODE_HELP.full.summary}
                      </p>
                      <p className="m-0" style={{ color: 'var(--text-quaternary)' }}>
                        {CLIENT_PORTAL_PRODUCT_MODE_HELP.full.detail}
                      </p>
                    </div>
                  </div>

                  {upgradeError && (
                    <div
                      className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
                      style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: '#EF4444' }}
                    >
                      <Warning className="w-3.5 h-3.5 flex-shrink-0" />
                      {upgradeError}
                    </div>
                  )}

                  <div className="space-y-2">
                    {freeSnapshotAccess?.showCallout ? (
                      <p className="text-xs m-0 leading-relaxed rounded-lg px-3 py-2.5" style={{ color: 'var(--text-secondary)', background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
                        This scan did not retrieve page HTML, so there is little to pre-fill from the quick check. You can still continue — the brief matters most — or use{' '}
                        <strong style={{ color: 'var(--text-primary)' }}>Start fresh</strong> if you prefer empty recon placeholders.
                      </p>
                    ) : null}
                    <button
                      type="button"
                      disabled={upgradeBusy}
                      onClick={() => void handleUpgradeFromSnapshot(true)}
                      className="w-full py-2.5 rounded-lg text-sm font-medium flex items-center justify-center gap-2"
                      style={{
                        background: upgradeBusy ? 'var(--bg-muted)' : 'var(--gradient-brand)',
                        color: upgradeBusy ? 'var(--text-quaternary)' : 'var(--glc-ink)',
                        cursor: upgradeBusy ? 'not-allowed' : 'pointer',
                        boxShadow: upgradeBusy ? 'none' : 'var(--glow-blue-sm)',
                        border: 'none',
                      }}
                    >
                      {upgradeBusy ? <Spinner className="w-4 h-4 animate-spin" /> : <Rocket className="w-4 h-4" />}
                      {freeSnapshotAccess?.showCallout ? 'Continue with limited scan data' : 'Continue with detected details'}
                    </button>
                    <div
                      className="rounded-lg px-3 py-2.5 space-y-2"
                      style={{ background: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}
                    >
                      <p className="text-xs m-0 font-medium" style={{ color: 'var(--text-secondary)' }}>
                        We pre-fill your brief and recon notes from this quick scan:
                      </p>
                      <ul className="text-xs m-0 pl-4 space-y-1.5 list-disc leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                        <li>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Tech stack</span> — tools we
                          detected (CMS, analytics, tags, frameworks) for technical recon and phase context.
                        </li>
                        <li>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Site profile</span> — short
                          label, industry guess, primary offer, audience (B2B/B2C), and conversion pattern from public
                          pages.
                        </li>
                        <li>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Homepage copy</span> — title,
                          meta description, or first substantive paragraph we captured.
                        </li>
                        <li>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Business activity draft</span>{' '}
                          — paragraph for your primary goal field, combining profile + scan summary when available.
                        </li>
                        <li>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Snapshot score hint</span> —
                          overall /100 from the scan stored in recon prefills (the full audit is re-scored from
                          scratch).
                        </li>
                        <li>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Analytics</span> — when GA /
                          GTM / gtag signals are present we mark analytics in the brief.
                        </li>
                      </ul>
                      <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                        {upgradeTarget === 'express'
                          ? 'Express uses this context for recon and phases 1–4 (Tech, Security, SEO, UX). Marketing, Automation, and Strategy are not included in Express.'
                          : 'Full audit uses this context across all six analysis domains and the Strategy phase after your brief meets start gates.'}{' '}
                        You can edit every field before the run.
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={upgradeBusy}
                      onClick={() => void handleUpgradeFromSnapshot(false)}
                      className="w-full py-2.5 rounded-lg text-sm font-medium"
                      style={{
                        backgroundColor: 'var(--bg-elevated)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                        cursor: upgradeBusy ? 'not-allowed' : 'pointer',
                      }}
                    >
                      Start fresh (site URL only)
                    </button>
                    <p className="text-xs m-0 leading-relaxed" style={{ color: 'var(--text-quaternary)' }}>
                      Clears our quick-scan recon data and brief answers derived from it, and resets placeholders for a
                      full {upgradeTarget === 'express' ? 'Express' : 'Full'} audit. Quick scan scores are not carried into
                      the new run.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isCreated && meta.status === 'completed' && !isFreeSnapshot && (
              <Link
                to={`/portal/reports/${auditId}`}
                className="flex items-center justify-between gap-3 px-5 py-4 mobile:px-4 rounded-xl no-underline transition-all"
                style={{
                  background: 'linear-gradient(135deg, rgba(28,189,255,0.15) 0%, rgba(28,189,255,0.06) 100%)',
                  border: '1px solid rgba(28,189,255,0.25)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--glc-blue)' }} />
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

            {canViewPipeline && (
              <Link
                to={`/portal/pipeline/${auditId}`}
                className="flex items-center justify-between gap-3 px-5 py-4 mobile:px-4 rounded-xl no-underline"
                style={{
                  backgroundColor: 'rgba(28,189,255,0.05)',
                  border: '1px solid rgba(28,189,255,0.15)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Pulse className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--glc-blue)' }} />
                  <div>
                    <div className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>Pipeline status</div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>
                      {meta?.status === 'completed' ? 'Review phases and logs' : 'Follow live progress'}
                    </div>
                  </div>
                </div>
                <CaretRight className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
              </Link>
            )}

            {isCreated && !canViewPipeline && !isFreeSnapshot && (
              <p className="text-xs m-0 leading-relaxed px-1" style={{ color: 'var(--text-quaternary)' }}>
                Complete the required intake brief fields and save. After the brief allows starting your run, Pipeline
                appears here and in the sidebar so you can follow phases and logs.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
/** Audit + brief gates load via TanStack Query (`useAudit` + shared `brief` query key). */

export function ClientAuditView() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    return (
      <AppShell title="Portal" subtitle="">
        <div className="glc-page-content max-w-2xl mx-auto text-sm" style={{ color: '#EF4444' }}>Missing id.</div>
      </AppShell>
    );
  }

  return <ClientPortalAuditById auditId={id} />;
}
