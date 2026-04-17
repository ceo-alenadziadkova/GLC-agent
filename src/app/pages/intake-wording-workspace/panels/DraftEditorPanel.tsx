import { bankIdToBriefQuestion } from '../../../data/bankQuestionUiCatalog';
import { INTAKE_WORDING_WORKSPACE_COPY as W } from '../../../config/intake-wording-workspace-copy';
import { Button } from '../../../components/ui/button';

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
            <textarea className="glc-input ds-intake-wording-draft-minh text-sm" value={draftText} onChange={e => onDraftTextChange(e.target.value)} placeholder={W.fields.draftPlaceholder} />
          </label>
          <div className="flex flex-wrap gap-2 items-center">
            <Button type="button" variant="outline" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onSaveDraftLocal}>{W.actions.saveDraftLocal}</Button>
            <Button type="button" variant="outline" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onRevertEditor}>{W.actions.revertEditor}</Button>
            <Button type="button" variant="default" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onSyncServer}>{W.actions.syncServer}</Button>
            <Button type="button" variant="outline" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onPublishSelected}>{W.actions.publishSelected}</Button>
            <Button type="button" variant="outline" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onRollbackSelected}>{W.actions.rollbackSelected}</Button>
            <Button type="button" variant="outline" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onPublishAllInPlan}>{W.actions.publishAllInPlan}</Button>
            <Button type="button" variant="outline" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onCopyJson}>{W.actions.copyJson}</Button>
            <Button type="button" variant="outline" size="sm" className="h-auto px-2 py-1 text-xs" onClick={onOpenImport}>{W.actions.importJson}</Button>
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
