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
    <aside className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-3">
      <div className="text-xs font-semibold mb-2">{copy.inspectorTitle}</div>
      <div className="text-xs text-[var(--glc-muted)] mb-2">{copy.inspectorHint}</div>
      {props.selectedReasons.length === 0 ? (
        <div className="text-xs text-[var(--glc-muted)]">{copy.selectNodeToInspect}</div>
      ) : (
        <div className="space-y-3 max-h-[520px] overflow-auto">
          {props.selectedReasons.map(item => (
            <div key={item.id} className="rounded border border-[var(--glc-border)] bg-[var(--glc-surface)] p-2">
              <div className="text-xs font-mono">{item.id}</div>
              <div className="text-xs text-[var(--glc-muted)] mb-1">{props.resolveLabel(item.id)}</div>
              <div className="text-[length:var(--text-2xs)] uppercase tracking-wide text-[var(--glc-muted)] mb-1">
                {copy.statusLabel}: {item.status}
              </div>
              {item.reasons.length === 0 ? (
                <div className="text-xs text-[var(--glc-muted)]">{copy.noReasonRows}</div>
              ) : (
                <ul className="space-y-1 text-xs font-mono">
                  {item.reasons.map((reason, index) => (
                    <li key={`${item.id}-${reason.code}-${index}`}>
                      {reason.layer}/{reason.state}/{reason.code}
                      {reason.detail ? <span className="text-[var(--glc-muted)]"> — {reason.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
      {props.baReviewMode && (
        <div className="mt-4 pt-3 border-t border-[var(--glc-border)]">
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
            <div className="text-xs text-[var(--glc-muted)]">{copy.noWordingIssues}</div>
          ) : (
            <ul className="space-y-2 max-h-[280px] overflow-auto">
              {props.visibleBaItems.map(item => (
                <li key={item.id} className="rounded border border-[var(--glc-border)] bg-[var(--glc-surface)] p-2">
                  <button type="button" className="text-left w-full" onClick={() => props.onFocusWordingItem(item.id)}>
                    <div className="text-xs font-mono">{item.id}</div>
                    <div className="text-xs text-[var(--glc-muted)]">{props.resolveLabel(item.id)}</div>
                    <div
                      className={`text-[length:var(--text-2xs)] uppercase tracking-wide ${item.severity === 'high' ? 'text-rose-300' : 'text-amber-300'}`}
                    >
                      {item.severity}
                    </div>
                    <div className="text-[length:var(--text-2xs)] text-[var(--glc-muted)]">
                      {copy.qualityLabel}: {item.score}/100
                    </div>
                    <ul className="mt-1 space-y-0.5 text-xs text-[var(--glc-muted)]">
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

