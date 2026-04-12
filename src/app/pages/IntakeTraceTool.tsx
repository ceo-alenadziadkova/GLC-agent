import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { TreeStructure } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { IntakePlanQuestionTrace } from '../components/intake/IntakePlanQuestionTrace';
import { IntakeTraceBranchMap } from '../components/intake/IntakeTraceBranchMap';
import { IntakeTraceJourney } from '../components/intake/IntakeTraceJourney';
import type { IntakeBriefCollectionMode, ProductMode } from '../data/auditTypes';
import { bankIdToBriefQuestion } from '../data/bankQuestionUiCatalog';
import { buildIntakePlan } from '@glc/intake-core';
import { formatPlanTrace } from '@glc/intake-core';
import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';
import type { IntakePlan, IntakeSurface } from '@glc/intake-core';
import { useIntakeWordingDrafts } from '../hooks/useIntakeWordingDrafts';
import { INTAKE_TRACE_SCENARIO_PRESETS } from '../lib/intake-trace-scenarios';
import { isIntakeTraceIaV2Enabled } from '../lib/intake-trace-flags';
import {
  flushIntakeTraceToolTelemetrySync,
  trackIntakeTraceSessionCompleted,
  trackIntakeTraceTabOpened,
  trackIntakeWordingDraftSaved,
} from '../lib/intake-trace-tool-telemetry';
import { INTAKE_TRACE_TOOL_COPY as T } from '../config/intake-trace-tool-copy.en';

const PRODUCT_OPTIONS: { value: ProductMode; label: string }[] = [
  { value: 'full', label: 'full' },
  { value: 'express', label: 'express' },
  { value: 'free_snapshot', label: 'free_snapshot' },
];

const COLLECTION_OPTIONS: { value: IntakeBriefCollectionMode | ''; label: string }[] = [
  { value: '', label: '(omit)' },
  { value: 'self_serve', label: 'self_serve' },
  { value: 'interview', label: 'interview' },
  { value: 'pre_brief', label: 'pre_brief' },
  { value: 'discovery', label: 'discovery' },
];

const SURFACE_OPTIONS: { value: IntakeSurface | ''; label: string }[] = [
  { value: '', label: '(omit)' },
  { value: 'consultant_interview', label: 'consultant_interview' },
  { value: 'client_form', label: 'client_form' },
  { value: 'client_portal', label: 'client_portal' },
  { value: 'internal_review', label: 'internal_review' },
  { value: 'public_discovery', label: 'public_discovery' },
];

const DEFAULT_RESPONSES = INTAKE_TRACE_SCENARIO_PRESETS[0].responsesText;

type TraceOk = { ok: true; text: string; plan: IntakePlan };
type TraceErr = { ok: false; message: string };
type WorkspaceMode = 'diagnose' | 'advanced';
type Panel = 'tree' | 'journey' | 'branch' | 'trace' | 'json' | 'wording';

const ROUTE = '/admin/intake-trace';

export function IntakeTraceTool() {
  const iaV2 = isIntakeTraceIaV2Enabled();
  const [productMode, setProductMode] = useState<ProductMode>('full');
  const [collectionMode, setCollectionMode] = useState<IntakeBriefCollectionMode | ''>('');
  const [surface, setSurface] = useState<IntakeSurface | ''>('');
  const [responsesText, setResponsesText] = useState(DEFAULT_RESPONSES);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>('diagnose');
  const [panel, setPanel] = useState<Panel>('tree');
  const [viewMode, setViewMode] = useState<'simple' | 'expert'>('simple');
  const {
    drafts: wordingDrafts,
    published: wordingPublished,
    setDrafts: setWordingDrafts,
    syncToServer,
  } = useIntakeWordingDrafts();
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [draftText, setDraftText] = useState('');
  const [wordingSyncStatus, setWordingSyncStatus] = useState<'idle' | 'ok' | 'error'>('idle');

  const priorityById = useMemo(
    () => new Map(QUESTION_BANK_V1_STUBS.map(stub => [stub.id, stub.priority] as const)),
    [],
  );

  const trace: TraceOk | TraceErr = useMemo(() => {
    let responses: Record<string, unknown>;
    try {
      responses = JSON.parse(responsesText) as Record<string, unknown>;
      if (responses === null || typeof responses !== 'object' || Array.isArray(responses)) {
        return { ok: false, message: T.responsesNotObject };
      }
    } catch {
      return { ok: false, message: T.invalidJson };
    }
    try {
      const plan = buildIntakePlan({
        responses,
        productMode,
        collectionMode: collectionMode || undefined,
        surface: surface || undefined,
      });
      const text = formatPlanTrace(plan, {
        productMode,
        collectionMode: collectionMode || undefined,
        surface: surface || undefined,
      });
      return { ok: true, text, plan };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, message: msg };
    }
  }, [responsesText, productMode, collectionMode, surface]);

  const displayError = trace.ok === false ? trace.message : null;
  const displayText = trace.ok ? trace.text : '';

  const resolveLabel = (id: string): string => {
    const draft = wordingDrafts[id]?.trim();
    if (draft) return `${draft} (draft)`;
    const pub = wordingPublished[id]?.trim();
    if (pub) return `${pub} (published)`;
    const priority = priorityById.get(id) ?? 'recommended';
    return bankIdToBriefQuestion(id, priority).question;
  };
  const resolveCanonLabel = (id: string): string => {
    const priority = priorityById.get(id) ?? 'recommended';
    return bankIdToBriefQuestion(id, priority).question;
  };
  const resolveDraftLabel = (id: string): string | null => {
    const draft = wordingDrafts[id]?.trim();
    return draft && draft.length > 0 ? draft : null;
  };
  const resolvePublishedLabel = (id: string): string | null => {
    const pub = wordingPublished[id]?.trim();
    return pub && pub.length > 0 ? pub : null;
  };

  const allPlanIds = useMemo(
    () =>
      trace.ok
        ? [
            ...new Set([
              ...trace.plan.eligible,
              ...trace.plan.visible,
              ...trace.plan.required,
              ...trace.plan.hidden,
              ...trace.plan.deferred,
            ]),
          ].sort((a, b) => a.localeCompare(b))
        : [],
    [trace],
  );

  useEffect(() => {
    if (!trace.ok || allPlanIds.length === 0) {
      setSelectedDraftId('');
      setDraftText('');
      return;
    }
    if (!selectedDraftId || !allPlanIds.includes(selectedDraftId)) {
      const first = allPlanIds[0];
      setSelectedDraftId(first);
      setDraftText(wordingDrafts[first] ?? '');
    }
  }, [trace.ok, allPlanIds, selectedDraftId, wordingDrafts]);

  const syncDraftEditor = (id: string) => {
    setSelectedDraftId(id);
    setDraftText(wordingDrafts[id] ?? '');
  };

  const availablePanels: Panel[] = useMemo(() => {
    if (!iaV2) {
      return ['tree', 'journey', 'branch', 'trace', 'json', 'wording'];
    }
    if (workspaceMode === 'diagnose') return ['tree', 'journey', 'branch'];
    return ['trace', 'json'];
  }, [iaV2, workspaceMode]);

  const panelLabel = useMemo((): Record<Panel, string> => ({
    tree: iaV2 ? T.panelLabel.treeIaV2 : T.panelLabel.treeLegacy,
    journey: T.panelLabel.journey,
    branch: iaV2 ? T.panelLabel.branchIaV2 : T.panelLabel.branchLegacy,
    trace: iaV2 ? T.panelLabel.traceIaV2 : T.panelLabel.traceLegacy,
    json: T.panelLabel.json,
    wording: T.panelLabel.wording,
  }), [iaV2]);

  const panelHint = T.panelHint;

  useEffect(() => {
    if (!availablePanels.includes(panel)) {
      setPanel(availablePanels[0]);
    }
  }, [availablePanels, panel]);

  useEffect(() => {
    const t0 = performance.now();
    return () => {
      trackIntakeTraceSessionCompleted({
        route: ROUTE,
        duration_ms: Math.round(performance.now() - t0),
      });
      flushIntakeTraceToolTelemetrySync();
    };
  }, []);

  useEffect(() => {
    if (!trace.ok) return;
    trackIntakeTraceTabOpened({
      route: ROUTE,
      workspace_mode: iaV2 ? workspaceMode : 'legacy',
      panel,
    });
  }, [trace.ok, iaV2, workspaceMode, panel]);

  const applyScenarioPreset = (id: string) => {
    const preset = INTAKE_TRACE_SCENARIO_PRESETS.find(p => p.id === id);
    if (!preset) return;
    setProductMode(preset.productMode);
    setCollectionMode(preset.collectionMode);
    setSurface(preset.surface);
    setResponsesText(preset.responsesText);
    if (iaV2) {
      setWorkspaceMode('diagnose');
      setPanel('tree');
      setViewMode('simple');
    }
  };

  const showWordingReviewOnBranch = iaV2 ? false : true;

  return (
    <AppShell
      title={T.title}
      subtitle={T.subtitle}
      actions={<TreeStructure className="w-6 h-6 text-[var(--glc-muted)]" aria-hidden />}
    >
      <div className="glc-page-content max-w-5xl mx-auto space-y-4">
        {!iaV2 && (
          <p className="text-xs text-amber-200/90 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2">
            {T.legacyBannerPrefix}{' '}
            <span className="font-mono">{T.legacyBannerMonoFlag}</span> in{' '}
            <span className="font-mono">{T.legacyBannerMonoPath}</span>.
          </p>
        )}
        <p className="text-sm text-[var(--glc-muted)]">
          {T.introConsultantOnly}
          {iaV2 ? (
            <>
              {' '}
              {T.introIaV2Part1}
              <strong>{T.introIaV2Diagnose}</strong>
              {T.introIaV2Part2}
              <strong>{T.introIaV2Advanced}</strong>
              {T.introIaV2Part3}
              <Link to="/admin/intake-wording" className="text-[var(--glc-accent)] underline-offset-2 hover:underline">
                {T.introIaV2WordingLink}
              </Link>
              {T.introIaV2Part4}
            </>
          ) : (
            <>
              {' '}
              {T.introLegacyUse}
              <strong>{T.introLegacyQuestionTrace}</strong>
              {T.introLegacyForReasons}
              <code className="text-xs">reasonsById</code>
              {T.introLegacySemicolon}
              <strong>{T.introLegacyPlanJson}</strong>
              {T.introLegacyForMissing}
              <code className="text-xs">missingForReport</code>
              {T.introLegacySlash}
              <code className="text-xs">nextRecommended</code>
              {T.introLegacyEnd}
            </>
          )}
        </p>

        {iaV2 && (
          <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
            <summary className="cursor-pointer text-sm font-medium">{T.startHereSummary}</summary>
            <div className="mt-2 space-y-2 text-xs text-[var(--glc-muted)]">
              <p>
                1) Pick a preset. 2) Open &quot;Why this question appears&quot;. 3) Use Dependencies graph only if the
                cause is still unclear.
              </p>
              <div className="flex flex-wrap gap-2">
                {INTAKE_TRACE_SCENARIO_PRESETS.map(preset => (
                  <button
                    key={preset.id}
                    type="button"
                    className="glc-btn-secondary text-xs px-2 py-1"
                    onClick={() => applyScenarioPreset(preset.id)}
                    title={preset.hint}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>
          </details>
        )}

        {iaV2 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-[var(--glc-muted)]">{T.workspaceLabel}</span>
            <button
              type="button"
              className={`glc-btn-secondary text-xs px-2 py-1 ${workspaceMode === 'diagnose' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
              onClick={() => {
                setWorkspaceMode('diagnose');
                setPanel('tree');
              }}
            >
              {T.diagnose}
            </button>
            <button
              type="button"
              className={`glc-btn-secondary text-xs px-2 py-1 ${workspaceMode === 'advanced' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
              onClick={() => {
                setWorkspaceMode('advanced');
                setPanel('trace');
              }}
            >
              {T.advanced}
            </button>
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--glc-muted)]">{T.viewModeLabel}</span>
          <button
            type="button"
            className={`glc-btn-secondary text-xs px-2 py-1 ${viewMode === 'simple' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
            onClick={() => setViewMode('simple')}
          >
            {T.simple}
          </button>
          <button
            type="button"
            className={`glc-btn-secondary text-xs px-2 py-1 ${viewMode === 'expert' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
            onClick={() => setViewMode('expert')}
          >
            {T.expert}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{T.productMode}</span>
            <select
              className="glc-input"
              value={productMode}
              onChange={e => setProductMode(e.target.value as ProductMode)}
            >
              {PRODUCT_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{T.collectionMode}</span>
            <select
              className="glc-input"
              value={collectionMode}
              onChange={e => setCollectionMode(e.target.value as IntakeBriefCollectionMode | '')}
            >
              {COLLECTION_OPTIONS.map(o => (
                <option key={o.value || 'omit'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{T.surface}</span>
            <select
              className="glc-input"
              value={surface}
              onChange={e => setSurface(e.target.value as IntakeSurface | '')}
            >
              {SURFACE_OPTIONS.map(o => (
                <option key={o.value || 'omit'} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{T.responsesJsonLabel}</span>
          <textarea
            className="glc-input font-mono text-xs min-h-[140px]"
            value={responsesText}
            onChange={e => setResponsesText(e.target.value)}
            spellCheck={false}
          />
        </label>

        {displayError && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {displayError}
          </div>
        )}

        {trace.ok && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 text-xs">
            <div>
              <div className="text-[var(--glc-muted)]">{T.eligibleVisible}</div>
              <div className="font-mono tabular-nums">
                {trace.plan.eligible.length} / {trace.plan.visible.length}
              </div>
            </div>
            <div>
              <div className="text-[var(--glc-muted)]">{T.requiredCount}</div>
              <div className="font-mono tabular-nums">{trace.plan.required.length}</div>
            </div>
            <div>
              <div className="text-[var(--glc-muted)]">{T.missingForReport}</div>
              <div className="font-mono break-all">
                {trace.plan.missingForReport.length > 0 ? trace.plan.missingForReport.join(', ') : T.emDash}
              </div>
            </div>
            <div>
              <div className="text-[var(--glc-muted)]">{T.nextRecommended}</div>
              <div className="font-mono break-all">
                {trace.plan.nextRecommended.length > 0 ? trace.plan.nextRecommended.join(', ') : T.emDash}
              </div>
            </div>
          </div>
        )}

        {trace.ok && (
          <div className="flex flex-wrap gap-2">
            {availablePanels.map(p => (
              <button
                key={p}
                type="button"
                className={`glc-btn-secondary text-sm px-3 py-1.5 ${panel === p ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
                onClick={() => setPanel(p)}
                title={panelHint[p]}
              >
                {panelLabel[p]}
              </button>
            ))}
          </div>
        )}

        {trace.ok && (
          <p className="text-xs text-[var(--glc-muted)]">{panelHint[panel]}</p>
        )}

        {trace.ok && panel === 'tree' ? (
          <div className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 min-h-[200px]">
            <IntakePlanQuestionTrace plan={trace.plan} mode={viewMode} resolveLabel={resolveLabel} />
          </div>
        ) : trace.ok && panel === 'journey' ? (
          <div className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 min-h-[200px]">
            <IntakeTraceJourney plan={trace.plan} resolveLabel={resolveLabel} />
          </div>
        ) : trace.ok && panel === 'branch' ? (
          <div className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 min-h-[200px]">
            <IntakeTraceBranchMap
              plan={trace.plan}
              resolveLabel={resolveLabel}
              resolveCanonLabel={resolveCanonLabel}
              resolveDraftLabel={resolveDraftLabel}
              resolvePublishedLabel={resolvePublishedLabel}
              showWordingReview={showWordingReviewOnBranch}
            />
          </div>
        ) : trace.ok && panel === 'wording' ? (
          <div className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 min-h-[200px] space-y-3">
            {iaV2 ? (
              <p className="text-sm text-[var(--glc-muted)]">
                {T.wordingMovedIaV2}{' '}
                <Link to="/admin/intake-wording" className="text-[var(--glc-accent)] underline-offset-2 hover:underline">
                  {T.wordingWorkspaceLink}
                </Link>
                {T.wordingMovedIaV2Suffix}
              </p>
            ) : (
              <>
                <p className="text-xs text-[var(--glc-muted)]">
                  {T.wordingLegacyIntro}{' '}
                  <Link to="/admin/intake-wording" className="text-[var(--glc-accent)] underline-offset-2 hover:underline">
                    {T.wordingLegacyLink}
                  </Link>
                  {T.wordingLegacyIntroSuffix}
                </p>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">{T.questionId}</span>
                  <select
                    className="glc-input font-mono text-xs"
                    value={selectedDraftId}
                    onChange={e => syncDraftEditor(e.target.value)}
                  >
                    {allPlanIds.map(id => (
                      <option key={id} value={id}>
                        {id} — {resolveLabel(id)}
                      </option>
                    ))}
                  </select>
                </label>
                {selectedDraftId && (
                  <>
                    <div className="text-xs text-[var(--glc-muted)]">
                      {T.currentCanonLabel}{' '}
                      {bankIdToBriefQuestion(
                        selectedDraftId,
                        priorityById.get(selectedDraftId) ?? 'recommended',
                      ).question}
                    </div>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="font-medium">{T.draftWording}</span>
                      <textarea
                        className="glc-input min-h-[100px] text-sm"
                        value={draftText}
                        onChange={e => setDraftText(e.target.value)}
                        placeholder={T.draftPlaceholder}
                      />
                    </label>
                    <div className="flex flex-wrap gap-2 items-center">
                      <button
                        type="button"
                        className="glc-btn-secondary text-xs px-2 py-1"
                        onClick={() => {
                          if (!selectedDraftId) return;
                          const nextText = draftText.trim();
                          setWordingDrafts(prev => {
                            const next = { ...prev };
                            if (nextText) next[selectedDraftId] = nextText;
                            else delete next[selectedDraftId];
                            return next;
                          });
                          trackIntakeWordingDraftSaved({ route: ROUTE, question_id: selectedDraftId });
                        }}
                      >
                        {T.saveDraftLocal}
                      </button>
                      <button
                        type="button"
                        className="glc-btn-secondary text-xs px-2 py-1"
                        onClick={() => setDraftText(wordingDrafts[selectedDraftId] ?? '')}
                      >
                        {T.revertEditor}
                      </button>
                      <button
                        type="button"
                        className="glc-btn-primary text-xs px-2 py-1"
                        onClick={() => {
                          const nextText = draftText.trim();
                          const snapshot = { ...wordingDrafts };
                          if (nextText) snapshot[selectedDraftId] = nextText;
                          else delete snapshot[selectedDraftId];
                          setWordingDrafts(snapshot);
                          void syncToServer(snapshot, false)
                            .then(() => {
                              setWordingSyncStatus('ok');
                              trackIntakeWordingDraftSaved({ route: ROUTE, question_id: selectedDraftId });
                            })
                            .catch(() => setWordingSyncStatus('error'));
                        }}
                      >
                        {T.syncToServer}
                      </button>
                      <button
                        type="button"
                        className="glc-btn-secondary text-xs px-2 py-1"
                        onClick={() => {
                          const payload = JSON.stringify(wordingDrafts, null, 2);
                          navigator.clipboard.writeText(payload).catch(() => undefined);
                        }}
                      >
                        {T.copyJson}
                      </button>
                      {wordingSyncStatus !== 'idle' && (
                        <span
                          className={`text-xs ${wordingSyncStatus === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}
                        >
                          {wordingSyncStatus === 'ok' ? T.serverSyncOk : T.serverSyncFailed}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        ) : (
          <pre className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto min-h-[200px]">
            {trace.ok ? (panel === 'json' ? JSON.stringify(trace.plan, null, 2) : displayText) : ''}
            {!trace.ok && !displayError ? T.emptyTraceHint : null}
          </pre>
        )}
      </div>
    </AppShell>
  );
}
