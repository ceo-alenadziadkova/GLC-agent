import { useEffect, useMemo, useState } from 'react';
import { TreeStructure } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { IntakePlanQuestionTrace } from '../components/intake/IntakePlanQuestionTrace';
import { IntakeTraceBranchMap } from '../components/intake/IntakeTraceBranchMap';
import { IntakeTraceJourney } from '../components/intake/IntakeTraceJourney';
import type { IntakeBriefCollectionMode, ProductMode } from '../data/auditTypes';
import { bankIdToBriefQuestion } from '../data/bankQuestionUiCatalog';
import { buildIntakePlan } from '../../../server/src/intake/core/build-intake-plan';
import { formatPlanTrace } from '../../../server/src/intake/core/format-trace';
import { QUESTION_BANK_V1_STUBS } from '../../../server/src/intake/question-bank';
import type { IntakePlan, IntakeSurface } from '../../../server/src/intake/core/types';

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

const DEFAULT_RESPONSES = '{\n  "a2": "hospitality",\n  "a5": "no_website"\n}\n';
const DRAFT_STORAGE_KEY = 'intake_trace_wording_drafts_v1';

type TraceOk = { ok: true; text: string; plan: IntakePlan };
type TraceErr = { ok: false; message: string };

export function IntakeTraceTool() {
  const [productMode, setProductMode] = useState<ProductMode>('full');
  const [collectionMode, setCollectionMode] = useState<IntakeBriefCollectionMode | ''>('');
  const [surface, setSurface] = useState<IntakeSurface | ''>('');
  const [responsesText, setResponsesText] = useState(DEFAULT_RESPONSES);
  const [panel, setPanel] = useState<'trace' | 'tree' | 'json' | 'journey' | 'branch' | 'wording'>('tree');
  const [viewMode, setViewMode] = useState<'simple' | 'expert'>('simple');
  const [wordingDrafts, setWordingDrafts] = useState<Record<string, string>>({});
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [draftText, setDraftText] = useState('');

  const priorityById = useMemo(
    () => new Map(QUESTION_BANK_V1_STUBS.map(stub => [stub.id, stub.priority] as const)),
    [],
  );

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, string>;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        setWordingDrafts(parsed);
      }
    } catch {
      // no-op: keep empty drafts when storage is malformed
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(wordingDrafts));
  }, [wordingDrafts]);

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

  const displayError = trace.ok ? null : trace.message;
  const displayText = trace.ok ? trace.text : '';

  const resolveLabel = (id: string): string => {
    const draft = wordingDrafts[id]?.trim();
    if (draft) return `${draft} (draft)`;
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

  return (
    <AppShell
      title="Intake plan trace"
      subtitle="Runs buildIntakePlan locally — same resolver as the server CLI (debug only)"
      actions={(
        <TreeStructure className="w-6 h-6 text-[var(--glc-muted)]" aria-hidden />
      )}
    >
      <div className="glc-page-content max-w-5xl mx-auto space-y-4">
        <p className="text-sm text-[var(--glc-muted)]">
          Consultant-only tool. Paste responses as JSON; choose product mode, optional collection mode and surface
          (use discovery + public_discovery to exercise layout). Use Question trace to filter{' '}
          <code className="text-xs">reasonsById</code> by layer/state; Plan JSON for the full tuple including{' '}
          <code className="text-xs">missingForReport</code> and <code className="text-xs">nextRecommended</code>{' '}
          (required, then recommended, then optional primaries for gap domains when the flag is on).
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-[var(--glc-muted)]">View mode</span>
          <button
            type="button"
            className={`glc-btn-secondary text-xs px-2 py-1 ${viewMode === 'simple' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
            onClick={() => setViewMode('simple')}
          >
            Simple
          </button>
          <button
            type="button"
            className={`glc-btn-secondary text-xs px-2 py-1 ${viewMode === 'expert' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
            onClick={() => setViewMode('expert')}
          >
            Expert
          </button>
        </div>
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
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 text-xs">
            <div>
              <div className="text-[var(--glc-muted)]">Eligible / visible</div>
              <div className="font-mono tabular-nums">
                {trace.plan.eligible.length} / {trace.plan.visible.length}
              </div>
            </div>
            <div>
              <div className="text-[var(--glc-muted)]">Required (count)</div>
              <div className="font-mono tabular-nums">{trace.plan.required.length}</div>
            </div>
            <div>
              <div className="text-[var(--glc-muted)]">missingForReport</div>
              <div className="font-mono break-all">
                {trace.plan.missingForReport.length > 0 ? trace.plan.missingForReport.join(', ') : '—'}
              </div>
            </div>
            <div>
              <div className="text-[var(--glc-muted)]">nextRecommended</div>
              <div className="font-mono break-all">
                {trace.plan.nextRecommended.length > 0 ? trace.plan.nextRecommended.join(', ') : '—'}
              </div>
            </div>
          </div>
        )}
        {trace.ok && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`glc-btn-secondary text-sm px-3 py-1.5 ${panel === 'tree' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
              onClick={() => setPanel('tree')}
            >
              Question trace
            </button>
            <button
              type="button"
              className={`glc-btn-secondary text-sm px-3 py-1.5 ${panel === 'journey' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
              onClick={() => setPanel('journey')}
            >
              User journey
            </button>
            <button
              type="button"
              className={`glc-btn-secondary text-sm px-3 py-1.5 ${panel === 'branch' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
              onClick={() => setPanel('branch')}
            >
              Branch map
            </button>
            <button
              type="button"
              className={`glc-btn-secondary text-sm px-3 py-1.5 ${panel === 'trace' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
              onClick={() => setPanel('trace')}
            >
              Trace text
            </button>
            <button
              type="button"
              className={`glc-btn-secondary text-sm px-3 py-1.5 ${panel === 'json' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
              onClick={() => setPanel('json')}
            >
              Plan JSON
            </button>
            <button
              type="button"
              className={`glc-btn-secondary text-sm px-3 py-1.5 ${panel === 'wording' ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
              onClick={() => setPanel('wording')}
            >
              Wording drafts
            </button>
          </div>
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
            />
          </div>
        ) : trace.ok && panel === 'wording' ? (
          <div className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 min-h-[200px] space-y-3">
            <p className="text-xs text-[var(--glc-muted)]">
              Draft wording only: updates are local to this browser and do not change intake policy/bank artifacts.
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
                <div className="text-xs text-[var(--glc-muted)]">
                  Current canon label: {bankIdToBriefQuestion(selectedDraftId, priorityById.get(selectedDraftId) ?? 'recommended').question}
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
                <div className="flex flex-wrap gap-2">
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
                    }}
                  >
                    Save draft
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
                        const parsed = JSON.parse(raw) as Record<string, string>;
                        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                          setWordingDrafts(parsed);
                        }
                      } catch {
                        // no-op
                      }
                    }}
                  >
                    Import JSON
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <pre className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 text-xs font-mono whitespace-pre-wrap overflow-x-auto min-h-[200px]">
            {trace.ok
              ? panel === 'json'
                ? JSON.stringify(trace.plan, null, 2)
                : displayText
              : ''}
            {!trace.ok && !displayError ? 'Adjust inputs to refresh trace.' : null}
          </pre>
        )}
      </div>
    </AppShell>
  );
}
