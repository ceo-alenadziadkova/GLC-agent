import type { Dispatch, SetStateAction } from 'react';
import { Button } from '../../../../components/ui/button';
import { SectionLabel } from '../../../../components/glc/SectionLabel';
import type { PipelineMonitorCopy } from '../../../../config/pipeline-monitor-copy';
import { STRATEGY_PHASE_ID } from '../../phase-meta';
import type { PhaseView } from '../../types';
import { PHASE_RESULT_EDITOR_ID_PREFIXES } from './phase-detail-editor-config';
import type { EditableIssueRow, EditableQuickWinRow, EditableRecommendationRow } from './phase-detail-types';

type PhaseResultEditorCopy = PipelineMonitorCopy['detail']['phaseResultEditor'];

type ImpactRow = EditableIssueRow | EditableRecommendationRow;

function EditableImpactListEditor(props: {
  listLabel: string;
  addLabel: string;
  idPrefix: string;
  rows: ImpactRow[];
  setRows: Dispatch<SetStateAction<ImpactRow[]>>;
  reactKeyPrefix: string;
  copy: PhaseResultEditorCopy;
}) {
  const { listLabel, addLabel, idPrefix, rows, setRows, reactKeyPrefix, copy } = props;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-muted-foreground text-xs">{listLabel}</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              { id: `${idPrefix}${prev.length + 1}`, title: '', description: '', impact: '' },
            ])
          }
        >
          {addLabel}
        </Button>
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={`${reactKeyPrefix}-${index}`} className="rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                value={row.id}
                onChange={(event) =>
                  setRows((prev) => prev.map((item, i) => (i === index ? { ...item, id: event.target.value } : item)))
                }
                placeholder={copy.placeholders.id}
              />
              <input
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                value={row.title}
                onChange={(event) =>
                  setRows((prev) => prev.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)))
                }
                placeholder={copy.placeholders.title}
              />
            </div>
            <textarea
              className="w-full min-h-[length:var(--pipeline-monitor-result-editor-min-height-sm)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
              value={row.description}
              onChange={(event) =>
                setRows((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)),
                )
              }
              placeholder={copy.placeholders.description}
            />
            <input
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
              value={row.impact}
              onChange={(event) =>
                setRows((prev) => prev.map((item, i) => (i === index ? { ...item, impact: event.target.value } : item)))
              }
              placeholder={copy.placeholders.impact}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>
              {copy.removeRow}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

function EditableQuickWinListEditor(props: {
  copy: PhaseResultEditorCopy;
  rows: EditableQuickWinRow[];
  setRows: Dispatch<SetStateAction<EditableQuickWinRow[]>>;
}) {
  const { copy, rows, setRows } = props;
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-muted-foreground text-xs">{copy.quickWinsLabel}</label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setRows((prev) => [
              ...prev,
              {
                id: `${PHASE_RESULT_EDITOR_ID_PREFIXES.quickWin}${prev.length + 1}`,
                title: '',
                description: '',
                timeframe: '',
              },
            ])
          }
        >
          {copy.addQuickWin}
        </Button>
      </div>
      <div className="space-y-3">
        {rows.map((row, index) => (
          <div key={`quick-win-${index}`} className="rounded-md border border-[var(--border-subtle)] p-3 space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <input
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                value={row.id}
                onChange={(event) =>
                  setRows((prev) => prev.map((item, i) => (i === index ? { ...item, id: event.target.value } : item)))
                }
                placeholder={copy.placeholders.id}
              />
              <input
                className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
                value={row.title}
                onChange={(event) =>
                  setRows((prev) => prev.map((item, i) => (i === index ? { ...item, title: event.target.value } : item)))
                }
                placeholder={copy.placeholders.title}
              />
            </div>
            <textarea
              className="w-full min-h-[length:var(--pipeline-monitor-result-editor-min-height-sm)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
              value={row.description}
              onChange={(event) =>
                setRows((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, description: event.target.value } : item)),
                )
              }
              placeholder={copy.placeholders.description}
            />
            <input
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
              value={row.timeframe}
              onChange={(event) =>
                setRows((prev) =>
                  prev.map((item, i) => (i === index ? { ...item, timeframe: event.target.value } : item)),
                )
              }
              placeholder={copy.placeholders.timeframe}
            />
            <Button type="button" variant="outline" size="sm" onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}>
              {copy.removeRow}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

type Props = {
  isOpen: boolean;
  selectedPhase: PhaseView;
  editorCopy: PhaseResultEditorCopy;
  busy: boolean;
  error: string | null;
  onSave: () => void | Promise<void>;
  onCancel: () => void;
  executiveSummaryDraft: string;
  setExecutiveSummaryDraft: (value: string) => void;
  labelDraft: string;
  setLabelDraft: (value: string) => void;
  summaryDraft: string;
  setSummaryDraft: (value: string) => void;
  strengthsDraft: string;
  setStrengthsDraft: (value: string) => void;
  weaknessesDraft: string;
  setWeaknessesDraft: (value: string) => void;
  issuesDraft: EditableIssueRow[];
  setIssuesDraft: Dispatch<SetStateAction<EditableIssueRow[]>>;
  quickWinsDraft: EditableQuickWinRow[];
  setQuickWinsDraft: Dispatch<SetStateAction<EditableQuickWinRow[]>>;
  recommendationsDraft: EditableRecommendationRow[];
  setRecommendationsDraft: Dispatch<SetStateAction<EditableRecommendationRow[]>>;
};

export function PhaseResultEditor(props: Props) {
  const {
    isOpen,
    selectedPhase,
    editorCopy,
    busy,
    error,
    onSave,
    onCancel,
    executiveSummaryDraft,
    setExecutiveSummaryDraft,
    labelDraft,
    setLabelDraft,
    summaryDraft,
    setSummaryDraft,
    strengthsDraft,
    setStrengthsDraft,
    weaknessesDraft,
    setWeaknessesDraft,
    issuesDraft,
    setIssuesDraft,
    quickWinsDraft,
    setQuickWinsDraft,
    recommendationsDraft,
    setRecommendationsDraft,
  } = props;

  if (!isOpen) return null;

  const isStrategyPhase = selectedPhase.id === STRATEGY_PHASE_ID;

  return (
    <div className="glc-card rounded-xl p-4 space-y-3">
      <SectionLabel>{editorCopy.title}</SectionLabel>
      {isStrategyPhase ? (
        <div className="space-y-2">
          <label className="text-muted-foreground text-xs">{editorCopy.executiveSummaryLabel}</label>
          <textarea
            className="w-full min-h-[length:var(--pipeline-monitor-result-editor-min-height-lg)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
            value={executiveSummaryDraft}
            onChange={(event) => setExecutiveSummaryDraft(event.target.value)}
          />
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs">{editorCopy.labelLabel}</label>
            <input
              className="w-full rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-sm"
              value={labelDraft}
              onChange={(event) => setLabelDraft(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-muted-foreground text-xs">{editorCopy.summaryLabel}</label>
            <textarea
              className="w-full min-h-[length:var(--pipeline-monitor-result-editor-min-height-md)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
              value={summaryDraft}
              onChange={(event) => setSummaryDraft(event.target.value)}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs">{editorCopy.strengthsLabel}</label>
              <textarea
                className="w-full min-h-[length:var(--pipeline-monitor-result-editor-min-height-md)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
                value={strengthsDraft}
                onChange={(event) => setStrengthsDraft(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-muted-foreground text-xs">{editorCopy.weaknessesLabel}</label>
              <textarea
                className="w-full min-h-[length:var(--pipeline-monitor-result-editor-min-height-md)] rounded-md border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3 text-sm"
                value={weaknessesDraft}
                onChange={(event) => setWeaknessesDraft(event.target.value)}
              />
            </div>
          </div>
          <EditableImpactListEditor
            listLabel={editorCopy.issuesLabel}
            addLabel={editorCopy.addIssue}
            idPrefix={PHASE_RESULT_EDITOR_ID_PREFIXES.issue}
            rows={issuesDraft}
            setRows={setIssuesDraft}
            reactKeyPrefix="issue"
            copy={editorCopy}
          />
          <EditableQuickWinListEditor copy={editorCopy} rows={quickWinsDraft} setRows={setQuickWinsDraft} />
          <EditableImpactListEditor
            listLabel={editorCopy.recommendationsLabel}
            addLabel={editorCopy.addRecommendation}
            idPrefix={PHASE_RESULT_EDITOR_ID_PREFIXES.recommendation}
            rows={recommendationsDraft}
            setRows={setRecommendationsDraft}
            reactKeyPrefix="recommendation"
            copy={editorCopy}
          />
        </>
      )}
      {error ? <p className="text-[var(--score-1)] text-xs">{error}</p> : null}
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" onClick={() => void onSave()} disabled={busy}>
          {busy ? editorCopy.saving : editorCopy.save}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onCancel} disabled={busy}>
          {editorCopy.cancel}
        </Button>
      </div>
    </div>
  );
}
