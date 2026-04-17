import { INTAKE_TRACE_GRAPH_CONFIG } from '../config/graph-config';
import { INTAKE_TRACE_EDGE_GRAPH_UI_COPY } from '../config/graph-copy';
import type { WordingScoringMode } from '../types';
import { Button } from '../../../ui/button';

interface GraphAdvancedControlsProps {
  showWordingReview: boolean;
  baReviewMode: boolean;
  onToggleBaReviewMode: () => void;
  onResetPreferences: () => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  downstreamDepth: number;
  onDownstreamDepthChange: (value: number) => void;
  sections: Array<[string, number]>;
  collapsedSections: Set<string>;
  onToggleSection: (section: string) => void;
}

export function GraphAdvancedControls(props: GraphAdvancedControlsProps) {
  const copy = INTAKE_TRACE_EDGE_GRAPH_UI_COPY.actions;
  const depthRange = INTAKE_TRACE_GRAPH_CONFIG.prefs.downstreamDepth;
  const secondaryButtonClassName = 'h-auto px-2 py-1 text-xs';

  return (
    <details className="rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface-2)] p-2">
      <summary className="cursor-pointer text-xs font-medium text-[var(--glc-fg)]">{copy.advancedControls}</summary>
      <div className="mt-2 space-y-2">
        <div className="flex flex-wrap gap-2">
          {props.showWordingReview && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={`${secondaryButtonClassName} ${props.baReviewMode ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
              onClick={props.onToggleBaReviewMode}
            >
              {props.baReviewMode ? copy.hideBaReview : copy.showBaReview}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={secondaryButtonClassName}
            onClick={props.onResetPreferences}
          >
            {copy.resetPreferences}
          </Button>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--glc-muted)]">{copy.searchNode}</span>
            <input
              type="search"
              className="glc-input font-mono text-xs"
              value={props.searchQuery}
              onChange={event => props.onSearchQueryChange(event.target.value)}
              placeholder={copy.searchPlaceholder}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs">
            <span className="text-[var(--glc-muted)]">{copy.downstreamDepthFromFocus}</span>
            <input
              type="range"
              min={depthRange.min}
              max={depthRange.max}
              step={1}
              value={props.downstreamDepth}
              onChange={event => props.onDownstreamDepthChange(Number(event.target.value))}
            />
            <span className="text-[var(--glc-muted)]">{props.downstreamDepth}</span>
          </label>
          <div className="text-xs rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface)] p-2">
            <div className="font-medium mb-1">{copy.legend}</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              {INTAKE_TRACE_EDGE_GRAPH_UI_COPY.legendRows.map(row => (
                <span key={row.status} className="contents">
                  <span>{row.status}</span>
                  <span>{row.tone}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1">
          {props.sections.map(([section, count]) => (
            <Button
              key={section}
              type="button"
              onClick={() => props.onToggleSection(section)}
              variant="outline"
              size="sm"
              className={`h-auto px-2 py-1 text-xs ${props.collapsedSections.has(section) ? 'opacity-60' : ''}`}
            >
              {copy.section} {section} ({count}) {props.collapsedSections.has(section) ? copy.collapsed : copy.shown}
            </Button>
          ))}
        </div>
      </div>
    </details>
  );
}

interface WordingReviewPanelControlsProps {
  averageWordingScore: number;
  scoringMode: WordingScoringMode;
  onScoringModeChange: (mode: WordingScoringMode) => void;
  highOnly: boolean;
  onToggleHighOnly: () => void;
  onExportMarkdown: () => void;
}

export function WordingReviewPanelControls(props: WordingReviewPanelControlsProps) {
  const copy = INTAKE_TRACE_EDGE_GRAPH_UI_COPY.actions;
  const secondaryButtonClassName = 'h-auto px-2 py-1 text-xs';
  return (
    <div className="mb-2 flex flex-wrap gap-2">
      <span className="text-xs text-[var(--glc-muted)]">
        {copy.averageQuality}: {props.averageWordingScore}/100
      </span>
      <div className="flex flex-wrap gap-1">
        {(['strict', 'normal', 'lenient'] as const).map(mode => (
          <Button
            key={mode}
            type="button"
            variant="outline"
            size="sm"
            className={`${secondaryButtonClassName} ${props.scoringMode === mode ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
            onClick={() => props.onScoringModeChange(mode)}
          >
            {mode}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`${secondaryButtonClassName} ${props.highOnly ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
        onClick={props.onToggleHighOnly}
      >
        {props.highOnly ? copy.showAllSeverities : copy.showHighOnly}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={secondaryButtonClassName}
        onClick={props.onExportMarkdown}
      >
        {copy.exportReviewMarkdown}
      </Button>
    </div>
  );
}

