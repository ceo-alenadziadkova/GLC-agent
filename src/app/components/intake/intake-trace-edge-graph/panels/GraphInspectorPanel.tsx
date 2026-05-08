import { INTAKE_TRACE_EDGE_GRAPH_UI_COPY } from '../config/graph-copy';
import { WordingReviewPanelControls } from './GraphAdvancedControls';
import type { SelectedReason, WordingReviewItem, WordingScoringMode } from '../types';

interface GraphInspectorPanelProps {
  selectedReasons: SelectedReason[];
  resolveLabel: (id: string) => string;
  baReviewMode: boolean;
  averageWordingScore: number;
  scoringMode: WordingScoringMode;
  onScoringModeChange: (mode: WordingScoringMode) => void;
  highOnly: boolean;
  onToggleHighOnly: () => void;
  onExportReviewMarkdown: () => void;
  visibleBaItems: WordingReviewItem[];
  onFocusWordingItem: (id: string) => void;
}

export function GraphInspectorPanel(props: GraphInspectorPanelProps) {
  const copy = INTAKE_TRACE_EDGE_GRAPH_UI_COPY.actions;

  return (
    <aside className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-muted)] p-3">
      <div className="text-xs font-semibold mb-2">{copy.inspectorTitle}</div>
      <div className="mb-2 text-xs text-[var(--text-tertiary)]">{copy.inspectorHint}</div>
      {props.selectedReasons.length === 0 ? (
        <div className="text-xs text-[var(--text-tertiary)]">{copy.selectNodeToInspect}</div>
      ) : (
        <div className="space-y-3 max-h-[520px] overflow-auto">
          {props.selectedReasons.map(item => (
            <div key={item.id} className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2">
              <div className="text-xs font-mono">{item.id}</div>
              <div className="mb-1 text-xs text-[var(--text-tertiary)]">{props.resolveLabel(item.id)}</div>
              <div className="mb-1 text-[length:var(--text-2xs)] uppercase tracking-wide text-[var(--text-tertiary)]">
                {copy.statusLabel}: {item.status}
              </div>
              {item.reasons.length === 0 ? (
                <div className="text-xs text-[var(--text-tertiary)]">{copy.noReasonRows}</div>
              ) : (
                <ul className="space-y-1 text-xs font-mono">
                  {item.reasons.map((reason, index) => (
                    <li key={`${item.id}-${reason.code}-${index}`}>
                      {reason.layer}/{reason.state}/{reason.code}
                      {reason.detail ? <span className="text-[var(--text-tertiary)]"> — {reason.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      {props.baReviewMode && (
        <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
          <div className="text-xs font-semibold mb-2">{copy.baTitle}</div>
          <WordingReviewPanelControls
            averageWordingScore={props.averageWordingScore}
            scoringMode={props.scoringMode}
            onScoringModeChange={props.onScoringModeChange}
            highOnly={props.highOnly}
            onToggleHighOnly={props.onToggleHighOnly}
            onExportMarkdown={props.onExportReviewMarkdown}
          />
          {props.visibleBaItems.length === 0 ? (
            <div className="text-xs text-[var(--text-tertiary)]">{copy.noWordingIssues}</div>
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-auto">
              {props.visibleBaItems.map(item => (
                <li key={item.id} className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-2">
                  <button type="button" className="w-full text-left" onClick={() => props.onFocusWordingItem(item.id)}>
                    <div className="text-xs font-mono">{item.id}</div>
                    <div className="text-xs text-[var(--text-tertiary)]">{props.resolveLabel(item.id)}</div>
                    <div
                      className={`text-[length:var(--text-2xs)] uppercase tracking-wide ${item.severity === 'high' ? 'text-rose-300' : 'text-amber-300'}`}
                    >
                      {item.severity}
                    </div>
                    <div className="text-[length:var(--text-2xs)] text-[var(--text-tertiary)]">
                      {copy.qualityLabel}: {item.score}/100
                    </div>
                    <ul className="mt-1 space-y-0.5 text-xs text-[var(--text-tertiary)]">
                      {item.reasons.map(reason => (
                        <li key={`${item.id}-${reason}`}>- {reason}</li>
                      ))}
                    </ul>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </aside>
  );
}

