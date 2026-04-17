import type { IntakeBriefCollectionMode, ProductMode } from '../../data/auditTypes';
import type { IntakeSurface } from '@glc/intake-core';
import { bankIdToBriefQuestion } from '../../data/bankQuestionUiCatalog';
import { INTAKE_TRACE_SCENARIO_PRESETS } from '../../lib/intake-trace-scenarios';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { INTAKE_WORDING_WORKSPACE_COPY as W } from '../../config/intake-wording-workspace-copy';
import {
  COLLECTION_OPTIONS,
  PRODUCT_OPTIONS,
  SURFACE_OPTIONS,
} from './config';
import type { PublicationLogEntry } from './types';
import { formatPublicationLogTimestamp } from './model';

export function ScenarioPresetsPanel({ onApplyPreset }: { onApplyPreset: (id: string) => void }) {
  return (
    <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
      <summary className="cursor-pointer text-sm font-medium">{W.scenarioPresets.summaryLabel}</summary>
      <div className="mt-2 flex flex-wrap gap-2">
        {INTAKE_TRACE_SCENARIO_PRESETS.map(preset => (
          <button
            key={preset.id}
            type="button"
            className="glc-btn-secondary text-xs px-2 py-1"
            onClick={() => onApplyPreset(preset.id)}
            title={preset.hint}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </details>
  );
}

export function TraceControlsForm(props: {
  productMode: ProductMode;
  collectionMode: IntakeBriefCollectionMode | '';
  surface: IntakeSurface | '';
  responsesText: string;
  onProductModeChange: (value: ProductMode) => void;
  onCollectionModeChange: (value: IntakeBriefCollectionMode | '') => void;
  onSurfaceChange: (value: IntakeSurface | '') => void;
  onResponsesTextChange: (value: string) => void;
  displayError: string | null;
}) {
  const {
    productMode,
    collectionMode,
    surface,
    responsesText,
    onProductModeChange,
    onCollectionModeChange,
    onSurfaceChange,
    onResponsesTextChange,
    displayError,
  } = props;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{W.fields.productMode}</span>
          <select
            className="glc-input"
            value={productMode}
            onChange={event => onProductModeChange(event.target.value as ProductMode)}
          >
            {PRODUCT_OPTIONS.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{W.fields.collectionMode}</span>
          <select
            className="glc-input"
            value={collectionMode}
            onChange={event => onCollectionModeChange(event.target.value as IntakeBriefCollectionMode | '')}
          >
            {COLLECTION_OPTIONS.map(option => (
              <option key={option.value || 'omit'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium">{W.fields.surface}</span>
          <select
            className="glc-input"
            value={surface}
            onChange={event => onSurfaceChange(event.target.value as IntakeSurface | '')}
          >
            {SURFACE_OPTIONS.map(option => (
              <option key={option.value || 'omit'} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{W.fields.responsesJson}</span>
        <textarea
          className="glc-input font-mono text-xs min-h-[140px]"
          value={responsesText}
          onChange={event => onResponsesTextChange(event.target.value)}
          spellCheck={false}
        />
      </label>

      {displayError && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {displayError}
        </div>
      )}
    </>
  );
}

export function DraftEditorPanel(props: {
  hydrated: boolean;
  selectedDraftId: string;
  allPlanIds: string[];
  resolveLabel: (id: string) => string;
  onSelectDraftId: (id: string) => void;
  priorityById: Map<string, 'critical' | 'required' | 'recommended' | 'optional'>;
  wordingPublished: Record<string, string>;
  draftText: string;
  onDraftTextChange: (value: string) => void;
  onSaveDraftLocal: () => void;
  onRevertEditor: () => void;
  onSyncServer: () => void;
  onPublishSelected: () => void;
  onRollbackSelected: () => void;
  onPublishAllInPlan: () => void;
  onCopyJson: () => void;
  onOpenImport: () => void;
  syncStatus: 'idle' | 'ok' | 'error';
}) {
  const {
    hydrated,
    selectedDraftId,
    allPlanIds,
    resolveLabel,
    onSelectDraftId,
    priorityById,
    wordingPublished,
    draftText,
    onDraftTextChange,
    onSaveDraftLocal,
    onRevertEditor,
    onSyncServer,
    onPublishSelected,
    onRollbackSelected,
    onPublishAllInPlan,
    onCopyJson,
    onOpenImport,
    syncStatus,
  } = props;
  const selectedPriority = priorityById.get(selectedDraftId);
  const selectedBriefPriority = selectedPriority === 'critical' ? 'required' : (selectedPriority ?? 'recommended');

  return (
    <div className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3 space-y-3">
      <p className="text-xs text-[var(--glc-muted)]">
        {hydrated ? W.draftsHint.loaded : W.draftsHint.loading}
      </p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{W.fields.questionId}</span>
        <select
          className="glc-input font-mono text-xs"
          value={selectedDraftId}
          onChange={event => onSelectDraftId(event.target.value)}
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
              {bankIdToBriefQuestion(selectedDraftId, selectedBriefPriority).question}
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
              onChange={event => onDraftTextChange(event.target.value)}
              placeholder={W.fields.draftPlaceholder}
            />
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onSaveDraftLocal}>
              {W.actions.saveDraftLocal}
            </button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onRevertEditor}>
              {W.actions.revertEditor}
            </button>
            <button type="button" className="glc-btn-primary text-xs px-2 py-1" onClick={onSyncServer}>
              {W.actions.syncServer}
            </button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onPublishSelected}>
              {W.actions.publishSelected}
            </button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onRollbackSelected}>
              {W.actions.rollbackSelected}
            </button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onPublishAllInPlan}>
              {W.actions.publishAllInPlan}
            </button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onCopyJson}>
              {W.actions.copyJson}
            </button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onOpenImport}>
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
  );
}

export function PublicationLogPanel(props: {
  hydrated: boolean;
  publicationLog: PublicationLogEntry[];
  onRefresh: () => void;
}) {
  const { hydrated, publicationLog, onRefresh } = props;
  if (!hydrated) return null;
  return (
    <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
      <summary className="cursor-pointer text-sm font-medium">{W.publicationLog.summaryLabel}</summary>
      <div className="mt-3 space-y-2">
        <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onRefresh}>
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
                  {formatPublicationLogTimestamp(entry.created_at)}
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
  );
}

export function WorkspaceInfoDialog(props: {
  infoMessage: string | null;
  onClose: () => void;
}) {
  const { infoMessage, onClose } = props;
  return (
    <AlertDialog open={infoMessage !== null} onOpenChange={open => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{W.dialogs.noticeTitle}</AlertDialogTitle>
          <AlertDialogDescription className="whitespace-pre-wrap">
            {infoMessage ?? ''}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction type="button" onClick={onClose}>
            {W.dialogs.ok}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function ImportWordingDialog(props: {
  open: boolean;
  importJsonText: string;
  importParseError: string | null;
  onOpenChange: (open: boolean) => void;
  onImportTextChange: (value: string) => void;
  onCancel: () => void;
  onImport: () => void;
}) {
  const {
    open,
    importJsonText,
    importParseError,
    onOpenChange,
    onImportTextChange,
    onCancel,
    onImport,
  } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{W.dialogs.importTitle}</DialogTitle>
          <DialogDescription>{W.dialogs.importDescription}</DialogDescription>
        </DialogHeader>
        {importParseError && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {importParseError}
          </p>
        )}
        <textarea
          className="glc-input min-h-[160px] w-full text-xs font-mono"
          value={importJsonText}
          onChange={event => onImportTextChange(event.target.value)}
          placeholder={W.dialogs.importPlaceholder}
          aria-label={W.dialogs.importAriaLabel}
        />
        <DialogFooter className="gap-2 sm:gap-0">
          <button type="button" className="glc-btn-secondary" onClick={onCancel}>
            {W.dialogs.cancel}
          </button>
          <button type="button" className="glc-btn-primary" onClick={onImport}>
            {W.dialogs.import}
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
