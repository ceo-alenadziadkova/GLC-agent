import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { NotePencil } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import type { IntakeBriefCollectionMode, ProductMode } from '../data/auditTypes';
import { bankIdToBriefQuestion } from '../data/bankQuestionUiCatalog';
import { buildIntakePlan } from '@glc/intake-core';
import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';
import type { IntakePlan, IntakeSurface } from '@glc/intake-core';
import { useIntakeWordingDrafts } from '../hooks/useIntakeWordingDrafts';
import { INTAKE_TRACE_SCENARIO_PRESETS } from '../lib/intake-trace-scenarios';
import {
  flushIntakeTraceToolTelemetrySync,
  trackIntakeTraceSessionCompleted,
  trackIntakeTraceTabOpened,
  trackIntakeWordingDraftSaved,
  trackIntakeWordingPublished,
  trackIntakeWordingRollback,
} from '../lib/intake-trace-tool-telemetry';
import { apiFetch } from '../data/api-http';

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

  const refreshPublicationLog = useCallback(() => {
    return apiFetch<{ ok: true; entries: PublicationLogEntry[] }>(
      '/api/intake-trace-tool/wording-publication-log?limit=40',
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
        return { ok: false, message: 'Responses must be a JSON object.' };
      }
    } catch {
      return { ok: false, message: 'Invalid JSON in responses.' };
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

  const displayError = trace.ok ? null : trace.message;

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
    trackIntakeTraceTabOpened({ route: ROUTE, workspace_mode: 'wording', panel: 'wording' });
    return () => {
      trackIntakeTraceSessionCompleted({
        route: ROUTE,
        duration_ms: Math.round(performance.now() - t0),
      });
      flushIntakeTraceToolTelemetrySync();
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

  return (
    <AppShell
      title="Intake wording workspace"
      subtitle="Drafts, optional publish snapshot, and rollback — branch logic unchanged"
      actions={<NotePencil className="w-6 h-6 text-[var(--glc-muted)]" aria-hidden />}
    >
      <div className="glc-page-content max-w-5xl mx-auto space-y-4">
        <p className="text-sm text-[var(--glc-muted)]">
          Edit draft question wording per bank id. Open{' '}
          <Link to="/admin/intake-trace" className="text-[var(--glc-accent)] underline-offset-2 hover:underline">
            Intake trace
          </Link>{' '}
          for full resolver diagnostics and dependency graphs.
        </p>

        <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
          <summary className="cursor-pointer text-sm font-medium">Scenario presets</summary>
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
            <span className="font-medium">Product mode</span>
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
            <span className="font-medium">Collection mode</span>
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
            <span className="font-medium">Surface</span>
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
          <span className="font-medium">Responses (JSON object)</span>
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
              Drafts: {hydrated ? 'loaded (server merge when API available)' : 'loading…'}. Save updates local storage; Sync pushes drafts. Publish copies current server draft to the published snapshot; Rollback restores the editor draft from published (syncs from server).
            </p>
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium">Question id</span>
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
                    Canon label:{' '}
                    {bankIdToBriefQuestion(selectedDraftId, priorityById.get(selectedDraftId) ?? 'recommended').question}
                  </div>
                  {wordingPublished[selectedDraftId]?.trim() ? (
                    <div>
                      Published snapshot:{' '}
                      <span className="text-[var(--glc-fg)]">{wordingPublished[selectedDraftId]}</span>
                    </div>
                  ) : (
                    <div>No published snapshot yet for this id.</div>
                  )}
                </div>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="font-medium">Draft wording</span>
                  <textarea
                    className="glc-input min-h-[100px] text-sm"
                    value={draftText}
                    onChange={e => setDraftText(e.target.value)}
                    placeholder="Write a clearer wording for this question..."
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
                    Save draft (local)
                  </button>
                  <button
                    type="button"
                    className="glc-btn-secondary text-xs px-2 py-1"
                    onClick={() => setDraftText(wordingDrafts[selectedDraftId] ?? '')}
                  >
                    Revert editor
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
                    Sync to server
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
                            window.alert('Nothing published. Sync this draft to the server first, or ensure draft text is non-empty on the server.');
                          }
                        })
                        .then(() => {
                          void refreshPublicationLog();
                        })
                        .catch(() => setSyncStatus('error'));
                    }}
                  >
                    Publish selected
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
                            window.alert('No rollback: no published snapshot for this id.');
                          }
                        })
                        .then(() => {
                          void refreshPublicationLog();
                        })
                        .catch(() => setSyncStatus('error'));
                    }}
                  >
                    Rollback selected
                  </button>
                  <button
                    type="button"
                    className="glc-btn-secondary text-xs px-2 py-1"
                    onClick={() => {
                      const ids = allPlanIds.filter(id => (wordingDrafts[id] ?? '').trim().length > 0);
                      if (ids.length === 0) {
                        window.alert('No drafts in the current plan to publish.');
                        return;
                      }
                      void publishWording(ids)
                        .then(res => {
                          const n = res.applied_to?.length ?? 0;
                          trackIntakeWordingPublished({ route: ROUTE, count: n });
                          setSyncStatus('ok');
                          if (n < ids.length) {
                            window.alert(
                              `Published ${n} of ${ids.length}. Missing rows or empty server drafts were skipped; use Sync to server for each id first.`,
                            );
                          }
                        })
                        .then(() => {
                          void refreshPublicationLog();
                        })
                        .catch(() => setSyncStatus('error'));
                    }}
                  >
                    Publish all drafts in plan
                  </button>
                  <button
                    type="button"
                    className="glc-btn-secondary text-xs px-2 py-1"
                    onClick={() => {
                      const payload = JSON.stringify(wordingDrafts, null, 2);
                      navigator.clipboard.writeText(payload).catch(() => undefined);
                    }}
                  >
                    Copy JSON
                  </button>
                  <button
                    type="button"
                    className="glc-btn-secondary text-xs px-2 py-1"
                    onClick={() => {
                      const raw = window.prompt('Paste wording draft JSON');
                      if (!raw) return;
                      try {
                        const parsed = JSON.parse(raw) as Record<string, unknown>;
                        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                          const next: Record<string, string> = {};
                          for (const [k, v] of Object.entries(parsed)) {
                            if (typeof v === 'string') next[k] = v;
                          }
                          setWordingDrafts(next);
                        }
                      } catch {
                        // no-op
                      }
                    }}
                  >
                    Import JSON
                  </button>
                  {syncStatus !== 'idle' && (
                    <span className={`text-xs ${syncStatus === 'ok' ? 'text-emerald-300' : 'text-red-300'}`}>
                      {syncStatus === 'ok' ? 'Server sync OK' : 'Server sync failed (check auth / network)'}
                    </span>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {hydrated && (
          <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
            <summary className="cursor-pointer text-sm font-medium">Publication log (audit trail)</summary>
            <div className="mt-3 space-y-2">
              <button
                type="button"
                className="glc-btn-secondary text-xs px-2 py-1"
                onClick={() => {
                  void refreshPublicationLog();
                }}
              >
                Refresh
              </button>
              {publicationLog.length === 0 ? (
                <p className="text-xs text-[var(--glc-muted)]">No publish or rollback events recorded for this account yet.</p>
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
    </AppShell>
  );
}
