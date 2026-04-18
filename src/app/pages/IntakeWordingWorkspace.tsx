import { Fragment, useCallback, useEffect, useMemo, useState } from 'react';
import { NotePencil } from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import type { IntakeBriefCollectionMode, ProductMode } from '../data/auditTypes';
import { QUESTION_BANK_V1_STUBS } from '@glc/intake-core';
import type { IntakeSurface } from '@glc/intake-core';
import { useIntakeWordingDrafts } from '../hooks/useIntakeWordingDrafts';
import {
  INTAKE_WORDING_WORKSPACE_COPY as W,
} from '../config/intake-wording-workspace-copy';
import { DEFAULT_SCENARIO_PRESET } from './intake-wording-workspace/config';
import {
  buildTraceFromInputs,
  collectPlanIds,
  parseWordingImportJson,
  resolveQuestionLabel,
} from './intake-wording-workspace/model';
import {
  emitWorkspaceClosed,
  emitWorkspaceOpened,
  fetchPublicationLog,
} from './intake-wording-workspace/services';
import type { PublicationLogEntry, TraceErr, TraceOk } from './intake-wording-workspace/types';
import { useWorkspaceActions } from './intake-wording-workspace/hooks';
import {
  DraftEditorPanel,
  ImportWordingDialog,
  PublicationLogPanel,
  ScenarioPresetsPanel,
  TraceControlsForm,
  WorkspaceInfoDialog,
} from './intake-wording-workspace/panels';
import { INTAKE_TRACE_SCENARIO_PRESETS } from '../lib/intake-trace-scenarios';

export function IntakeWordingWorkspace() {
  const [productMode, setProductMode] = useState<ProductMode>('full');
  const [collectionMode, setCollectionMode] = useState<IntakeBriefCollectionMode | ''>('');
  const [surface, setSurface] = useState<IntakeSurface | ''>('');
  const [responsesText, setResponsesText] = useState(DEFAULT_SCENARIO_PRESET.responsesText);
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
    return fetchPublicationLog().then(setPublicationLog).catch(() => undefined);
  }, []);

  const priorityById = useMemo(
    () => new Map(QUESTION_BANK_V1_STUBS.map(stub => [stub.id, stub.priority] as const)),
    [],
  );

  const trace: TraceOk | TraceErr = useMemo(
    () =>
      buildTraceFromInputs({
        responsesText,
        productMode,
        collectionMode,
        surface,
        invalidJsonMessage: W.traceErrors.invalidJson,
        notObjectMessage: W.traceErrors.responsesNotObject,
      }),
    [responsesText, productMode, collectionMode, surface],
  );

  const displayError = trace.ok === false ? trace.message : null;

  const resolveLabel = (id: string): string =>
    resolveQuestionLabel({ id, drafts: wordingDrafts, published: wordingPublished, priorityById });

  const allPlanIds = useMemo(() => collectPlanIds(trace), [trace]);

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
    emitWorkspaceOpened();
    return () => {
      emitWorkspaceClosed(Math.round(performance.now() - t0));
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
    const parsed = parseWordingImportJson(raw, W.importErrors.invalidJson, W.importErrors.notObjectMap);
    if (parsed.ok === false) {
      setImportParseError(parsed.message);
      return;
    }
    setWordingDrafts(parsed.drafts);
    setImportDialogOpen(false);
    setImportJsonText('');
  };

  const actions = useWorkspaceActions({
    selectedDraftId,
    draftText,
    wordingDrafts,
    allPlanIds,
    setWordingDrafts,
    setDraftText,
    setSyncStatus,
    setInfoMessage,
    syncToServer,
    publishWording,
    rollbackWording,
    refreshPublicationLog,
  });

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

        <ScenarioPresetsPanel onApplyPreset={applyScenarioPreset} />

        <TraceControlsForm
          productMode={productMode}
          collectionMode={collectionMode}
          surface={surface}
          responsesText={responsesText}
          onProductModeChange={setProductMode}
          onCollectionModeChange={setCollectionMode}
          onSurfaceChange={setSurface}
          onResponsesTextChange={setResponsesText}
          displayError={displayError}
        />

        {trace.ok && (
          <DraftEditorPanel
            hydrated={hydrated}
            selectedDraftId={selectedDraftId}
            allPlanIds={allPlanIds}
            resolveLabel={resolveLabel}
            onSelectDraftId={syncDraftEditor}
            priorityById={priorityById}
            wordingPublished={wordingPublished}
            draftText={draftText}
            onDraftTextChange={setDraftText}
            onSaveDraftLocal={actions.saveDraftLocal}
            onRevertEditor={actions.revertEditor}
            onSyncServer={actions.syncServer}
            onPublishSelected={actions.publishSelected}
            onRollbackSelected={actions.rollbackSelected}
            onPublishAllInPlan={actions.publishAllInPlan}
            onCopyJson={() => {
              const payload = JSON.stringify(wordingDrafts, null, 2);
              navigator.clipboard.writeText(payload).catch(() => undefined);
            }}
            onOpenImport={() => {
              setImportJsonText('');
              setImportParseError(null);
              setImportDialogOpen(true);
            }}
            syncStatus={syncStatus}
          />
        )}

        <PublicationLogPanel
          hydrated={hydrated}
          publicationLog={publicationLog}
          onRefresh={() => {
            void refreshPublicationLog();
          }}
        />
      </div>

      <WorkspaceInfoDialog infoMessage={infoMessage} onClose={() => setInfoMessage(null)} />

      <ImportWordingDialog
        open={importDialogOpen}
        importJsonText={importJsonText}
        importParseError={importParseError}
        onOpenChange={open => {
          setImportDialogOpen(open);
          if (!open) setImportParseError(null);
        }}
        onImportTextChange={setImportJsonText}
        onCancel={() => {
          setImportDialogOpen(false);
          setImportJsonText('');
        }}
        onImport={applyImportedWordingJson}
      />
      </Fragment>
    </AppShell>
  );
}
