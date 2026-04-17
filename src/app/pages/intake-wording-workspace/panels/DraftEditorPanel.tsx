import { bankIdToBriefQuestion } from '../../../data/bankQuestionUiCatalog';
import { INTAKE_WORDING_WORKSPACE_COPY as W } from '../../../config/intake-wording-workspace-copy';

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
      <p className="text-xs text-[var(--glc-muted)]">{hydrated ? W.draftsHint.loaded : W.draftsHint.loading}</p>
      <label className="flex flex-col gap-1 text-sm">
        <span className="font-medium">{W.fields.questionId}</span>
        <select className="glc-input font-mono text-xs" value={selectedDraftId} onChange={e => onSelectDraftId(e.target.value)}>
          {allPlanIds.map(id => (
            <option key={id} value={id}>{id} — {resolveLabel(id)}</option>
          ))}
        </select>
      </label>
      {selectedDraftId && (
        <>
          <div className="text-xs text-[var(--glc-muted)] space-y-1">
            <div>{W.fields.canonLabelPrefix} {bankIdToBriefQuestion(selectedDraftId, selectedBriefPriority).question}</div>
            {wordingPublished[selectedDraftId]?.trim() ? (
              <div>{W.fields.publishedSnapshotPrefix} <span className="text-[var(--glc-fg)]">{wordingPublished[selectedDraftId]}</span></div>
            ) : (
              <div>{W.fields.noPublishedYet}</div>
            )}
          </div>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{W.fields.draftWording}</span>
            <textarea className="glc-input min-h-[100px] text-sm" value={draftText} onChange={e => onDraftTextChange(e.target.value)} placeholder={W.fields.draftPlaceholder} />
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onSaveDraftLocal}>{W.actions.saveDraftLocal}</button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onRevertEditor}>{W.actions.revertEditor}</button>
            <button type="button" className="glc-btn-primary text-xs px-2 py-1" onClick={onSyncServer}>{W.actions.syncServer}</button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onPublishSelected}>{W.actions.publishSelected}</button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onRollbackSelected}>{W.actions.rollbackSelected}</button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onPublishAllInPlan}>{W.actions.publishAllInPlan}</button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onCopyJson}>{W.actions.copyJson}</button>
            <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={onOpenImport}>{W.actions.importJson}</button>
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
