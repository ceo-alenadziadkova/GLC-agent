import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { NotePencil } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import type { IntakeBriefCollectionMode, ProductMode } from '../data/auditTypes';
import { bankIdToBriefQuestion } from '../data/bankQuestionUiCatalog';
import { buildIntakePlan, INTAKE_TRACE_PUBLICATION_LOG_DEFAULT_LIMIT } from '@glc/intake-core';
import { apiIntakeTracePublicationLog } from '../config/api-paths';
import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';
import type { IntakePlan, IntakeSurface } from '@glc/intake-core';
import { useIntakeWordingDrafts } from '../hooks/useIntakeWordingDrafts';
import { INTAKE_TRACE_SCENARIO_PRESETS } from '../lib/intake-trace-scenarios';
import {
  flushIntakeWorkspaceTelemetrySync,
  trackIntakeWorkspaceSessionCompleted,
  trackIntakeWorkspaceTabOpened,
  trackIntakeWordingDraftSaved,
  trackIntakeWordingPublished,
  trackIntakeWordingRollback,
} from '../lib/intake-workspace-telemetry';
import { apiFetch } from '../data/api-http';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  INTAKE_WORDING_WORKSPACE_COPY as W,
  formatIntakeWordingPublishPartialMessage,
} from '../config/intake-wording-workspace-copy';

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

type TraceOk = { ok: true; plan: IntakePlan };
type TraceErr = { ok: false; message: string };

const ROUTE = '/admin/intake-wording';

type PublicationLogEntry = {
  id: string;
  action: 'publish' | 'rollback';
  question_ids: string[];
  created_at: string;
};

export function IntakeWordingWorkspace() {
  const [productMode, setProductMode] = useState<ProductMode>('full');
  const [collectionMode, setCollectionMode] = useState<IntakeBriefCollectionMode | ''>('');
  const [surface, setSurface] = useState<IntakeSurface | ''>('');
  const [responsesText, setResponsesText] = useState(DEFAULT_RESPONSES);
  const {
    drafts: wordingDrafts,
    published: wordingPublished,
    setDrafts: setWordingDrafts,
    hydrated,
    syncToServer,
    publishWording,
    rollbackWording,
  } = useIntakeWordingDrafts();
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [draftText, setDraftText] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'ok' | 'error'>('idle');
  const [publicationLog, setPublicationLog] = useState<PublicationLogEntry[]>([]);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importParseError, setImportParseError] = useState<string | null>(null);

  const refreshPublicationLog = useCallback(() => {
    return apiFetch<{ ok: true; entries: PublicationLogEntry[] }>(
      apiIntakeTracePublicationLog(INTAKE_TRACE_PUBLICATION_LOG_DEFAULT_LIMIT),
    )
      .then(r => setPublicationLog(r.entries))
      .catch(() => undefined);
  }, []);

  const priorityById = useMemo(
    () => new Map(QUESTION_BANK_V1_STUBS.map(stub => [stub.id, stub.priority] as const)),
    [],
  );

  const trace: TraceOk | TraceErr = useMemo(() => {
    let responses: Record<string, unknown>;
    try {
      responses = JSON.parse(responsesText) as Record<string, unknown>;
      if (responses === null || typeof responses !== 'object' || Array.isArray(responses)) {
        return { ok: false, message: W.traceErrors.responsesNotObject };
      }
    } catch {
      return { ok: false, message: W.traceErrors.invalidJson };
    }
    try {
      const plan = buildIntakePlan({
        responses,
        productMode,
        collectionMode: collectionMode || undefined,
        surface: surface || undefined,
      });
      return { ok: true, plan };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { ok: false, message: msg };
    }
  }, [responsesText, productMode, collectionMode, surface]);

  const displayError = trace.ok === false ? trace.message : null;

  const resolveLabel = (id: string): string => {
    const draft = wordingDrafts[id]?.trim();
    if (draft) return `${draft} (draft)`;
    const pub = wordingPublished[id]?.trim();
    if (pub) return `${pub} (published)`;
    const priority = priorityById.get(id) ?? 'recommended';
    return bankIdToBriefQuestion(id, priority).question;
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

  useEffect(() => {
    const t0 = performance.now();
    trackIntakeWorkspaceTabOpened({ route: ROUTE, workspace_mode: 'wording', panel: 'wording' });
    return () => {
      trackIntakeWorkspaceSessionCompleted({
        route: ROUTE,
        duration_ms: Math.round(performance.now() - t0),
      });
      flushIntakeWorkspaceTelemetrySync();
    };
  }, []);

  useEffect(() => {
    if (hydrated) void refreshPublicationLog();
  }, [hydrated, refreshPublicationLog]);

  const applyScenarioPreset = (id: string) => {
    const preset = INTAKE_TRACE_SCENARIO_PRESETS.find(p => p.id === id);
    if (!preset) return;
    setProductMode(preset.productMode);
    setCollectionMode(preset.collectionMode);
    setSurface(preset.surface);
    setResponsesText(preset.responsesText);
  };

  const applyImportedWordingJson = () => {
    const raw = importJsonText.trim();
    if (!raw) return;
    setImportParseError(null);
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const next: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'string') next[k] = v;
        }
        setWordingDrafts(next);
        setImportDialogOpen(false);
        setImportJsonText('');
      } else {
        setImportParseError(W.importErrors.notObjectMap);
      }
    } catch {
      setImportParseError(W.importErrors.invalidJson);
    }
  };

  return (
    <AppShell
      title={W.appShell.title}
      subtitle={W.appShell.subtitle}
      actions={<NotePencil className="w-6 h-6 text-[var(--glc-muted)]" aria-hidden />}
    >
      <Fragment>
      <div className="glc-page-content max-w-5xl mx-auto space-y-4">
        <p className="text-sm text-[var(--glc-muted)]">
          {W.intro}
        </p>

        <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
          <summary className="cursor-pointer text-sm font-medium">{W.scenarioPresets.summaryLabel}</summary>
          <div className="mt-2 flex flex-wrap gap-2">
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
        </details>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{W.fields.productMode}</span>
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
            <span className="font-medium">{W.fields.collectionMode}</span>
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
            <span className="font-medium">{W.fields.surface}</span>
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
          <span className="font-medium">{W.fields.responsesJson}</span>
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
          <div className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 space-y-3">
            <p className="text-xs text-[var(--glc-muted)]">
              {hydrated ? W.draftsHint.loaded : W.draftsHint.loading}
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">{W.fields.questionId}</span>
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
                <div className="text-xs text-[var(--glc-muted)] space-y-1">
                  <div>
                    {W.fields.canonLabelPrefix}{' '}
                    {bankIdToBriefQuestion(selectedDraftId, priorityById.get(selectedDraftId) ?? 'recommended').question}
                  </div>
                  {wordingPublished[selectedDraftId]?.trim() ? (
                    <div>
                      {W.fields.publishedSnapshotPrefix}{' '}
                      <span className="text-[var(--glc-fg)]">{wordingPublished[selectedDraftId]}</span>
                    </div>
                  ) : (
                    <div>{W.fields.noPublishedYet}</div>
                  )}
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">{W.fields.draftWording}</span>
                  <textarea
                    className="glc-input min-h-[100px] text-sm"
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    placeholder={W.fields.draftPlaceholder}
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
                    {W.actions.saveDraftLocal}
                  </button>
                  <button
                    type="button"
                    className="glc-btn-secondary text-xs px-2 py-1"
                    onClick={() => setDraftText(wordingDrafts[selectedDraftId] ?? '')}
                  >
                    {W.actions.revertEditor}
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
                          setSyncStatus('ok');
                        })
                        .catch(() => setSyncStatus('error'));
                    }}
                  >
                    {W.actions.syncServer}
                  </button>
                  <button
                    type="button"
                    className="glc-btn-secondary text-xs px-2 py-1"
                    onClick={() => {
                      void publishWording([selectedDraftId])
                        .then(res => {
                          const n = res.applied_to?.length ?? 0;
                          trackIntakeWordingPublished({ route: ROUTE, count: n });
                          setSyncStatus(n > 0 ? 'ok' : 'error');
                          if (n === 0) {
                            setInfoMessage(W.info.nothingPublished);
                          }
                        })
                        .then(() => {
                          void refreshPublicationLog();
                        })
                        .catch(() => setSyncStatus('error'));
                    }}
                  >
                    {W.actions.publishSelected}
                  </button>
                  <button
                    type="button"
                    className="glc-btn-secondary text-xs px-2 py-1"
                    onClick={() => {
                      void rollbackWording([selectedDraftId])
                        .then(res => {
                          const n = res.applied_to?.length ?? 0;
                          trackIntakeWordingRollback({ route: ROUTE, count: n });
                          setDraftText(res.drafts[selectedDraftId] ?? '');
                          setSyncStatus(n > 0 ? 'ok' : 'error');
                          if (n === 0) {
                            setInfoMessage(W.info.noRollback);
                          }
                        })
                        .then(() => {
                          void refreshPublicationLog();
                        })
                        .catch(() => setSyncStatus('error'));
                    }}
                  >
                    {W.actions.rollbackSelected}
                  </button>
                  <button
                    type="button"
                    className="glc-btn-secondary text-xs px-2 py-1"
                    onClick={() => {
                      const ids = allPlanIds.filter(id => (wordingDrafts[id] ?? '').trim().length > 0);
                      if (ids.length === 0) {
                        setInfoMessage(W.info.noDraftsToPublish);
                        return;
                      }
                      void publishWording(ids)
                        .then(res => {
                          const n = res.applied_to?.length ?? 0;
                          trackIntakeWordingPublished({ route: ROUTE, count: n });
                          setSyncStatus('ok');
                          if (n < ids.length) {
                            setInfoMessage(
                              formatIntakeWordingPublishPartialMessage(W.info.publishPartial, n, ids.length),
                            );
                          }
                        })
                        .then(() => {
                          void refreshPublicationLog();
                        })
                        .catch(() => setSyncStatus('error'));
                    }}
                  >
                    {W.actions.publishAllInPlan}
                  </button>
                  <button
                    type="button"
                    className="glc-btn-secondary text-xs px-2 py-1"
                    onClick={() => {
                      const payload = JSON.stringify(wordingDrafts, null, 2);
                      navigator.clipboard.writeText(payload).catch(() => undefined);
                    }}
                  >
                    {W.actions.copyJson}
                  </button>
                  <button
                    type="button"
                    className="glc-btn-secondary text-xs px-2 py-1"
                    onClick={() => {
                      setImportJsonText('');
                      setImportParseError(null);
                      setImportDialogOpen(true);
                    }}
                  >
                    {W.actions.importJson}
                  </button>
                  {syncStatus !== 'idle' && (
                    <span className={`text-xs ${syncStatus === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>
                      {syncStatus === 'ok' ? W.syncStatus.ok : W.syncStatus.error}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {hydrated && (
          <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
            <summary className="cursor-pointer text-sm font-medium">{W.publicationLog.summaryLabel}</summary>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                className="glc-btn-secondary text-xs px-2 py-1"
                onClick={() => {
                  void refreshPublicationLog();
                }}
              >
                {W.actions.refresh}
              </button>
              {publicationLog.length === 0 ? (
                <p className="text-xs text-[var(--glc-muted)]">{W.publicationLog.empty}</p>
              ) : (
                <ul className="space-y-2 text-xs font-mono max-h-[280px] overflow-auto">
                  {publicationLog.map(entry => (
                    <li
                      key={entry.id}
                      className="rounded border border-[var(--glc-border)] bg-[var(--glc-surface)] px-2 py-1.5"
                    >
                      <div className="text-[var(--glc-muted)]">
                        {new Date(entry.created_at).toISOString().replace('T', ' ').slice(0, 19)} UTC
                        {' — '}
                        <span className="text-[var(--glc-fg)]">{entry.action}</span>
                      </div>
                      <div className="break-all mt-0.5">{entry.question_ids.join(', ')}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </details>
        )}
      </div>

      <AlertDialog
        open={infoMessage !== null}
        onOpenChange={open => {
          if (!open) setInfoMessage(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{W.dialogs.noticeTitle}</AlertDialogTitle>
            <AlertDialogDescription className="whitespace-pre-wrap">
              {infoMessage ?? ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction type="button" onClick={() => setInfoMessage(null)}>
              {W.dialogs.ok}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={importDialogOpen}
        onOpenChange={open => {
          setImportDialogOpen(open);
          if (!open) setImportParseError(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{W.dialogs.importTitle}</DialogTitle>
            <DialogDescription>
              {W.dialogs.importDescription}
            </DialogDescription>
          </DialogHeader>
          {importParseError && (
            <p className="text-sm text-red-600 dark:text-red-400" role="alert">
              {importParseError}
            </p>
          )}
          <textarea
            className="glc-input min-h-[160px] w-full text-xs font-mono"
            value={importJsonText}
            onChange={e => setImportJsonText(e.target.value)}
            placeholder={W.dialogs.importPlaceholder}
            aria-label={W.dialogs.importAriaLabel}
          />
          <DialogFooter className="gap-2 sm:gap-0">
            <button
              type="button"
              className="glc-btn-secondary"
              onClick={() => {
                setImportDialogOpen(false);
                setImportJsonText('');
              }}
            >
              {W.dialogs.cancel}
            </button>
            <button type="button" className="glc-btn-primary" onClick={applyImportedWordingJson}>
              {W.dialogs.import}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </Fragment>
    </AppShell>
  );
}
