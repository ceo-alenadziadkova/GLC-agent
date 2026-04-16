import { INTAKE_TRACE_EDGE_GRAPH_UI_COPY } from '../config/graph-copy';

interface GraphToolbarProps {
  pathOnlyMode: boolean;
  onTogglePathOnlyMode: () => void;
  isFocusedSubtreeCollapsed: boolean;
  onToggleCollapseFocused: () => void;
  canCollapseFocused: boolean;
  onExpandAll: () => void;
  onExportSvg: () => void;
  onClearSelection: () => void;
  hasPinnedFocus: boolean;
  isCurrentFocusPinned: boolean;
  onTogglePin: () => void;
  canPinFocused: boolean;
  showBeforeAfter: boolean;
  onToggleShowBeforeAfter: () => void;
}

export function GraphToolbar(props: GraphToolbarProps) {
  const copy = INTAKE_TRACE_EDGE_GRAPH_UI_COPY.actions;
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        className={`glc-btn-secondary text-xs px-2 py-1 ${props.pathOnlyMode ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
        onClick={props.onTogglePathOnlyMode}
      >
        {props.pathOnlyMode ? copy.showFullGraph : copy.showPathOnly}
      </button>
      <button
        type="button"
        className={`glc-btn-secondary text-xs px-2 py-1 ${props.isFocusedSubtreeCollapsed ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
        onClick={props.onToggleCollapseFocused}
        disabled={!props.canCollapseFocused}
      >
        {props.isFocusedSubtreeCollapsed ? copy.expandFocusedSubtree : copy.collapseFocusedSubtree}
      </button>
      <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={props.onExpandAll}>
        {copy.expandAllSubtrees}
      </button>
      <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={props.onExportSvg}>
        {copy.exportSvg}
      </button>
      <button type="button" className="glc-btn-secondary text-xs px-2 py-1" onClick={props.onClearSelection}>
        {copy.clearMultiSelect}
      </button>
      <button
        type="button"
        className={`glc-btn-secondary text-xs px-2 py-1 ${props.hasPinnedFocus ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
        onClick={props.onTogglePin}
        disabled={!props.canPinFocused}
      >
        {props.isCurrentFocusPinned ? copy.unpinPath : copy.pinFocusedPath}
      </button>
      <button
        type="button"
        className={`glc-btn-secondary text-xs px-2 py-1 ${props.showBeforeAfter ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
        onClick={props.onToggleShowBeforeAfter}
      >
        {props.showBeforeAfter ? copy.hideBeforeAfter : copy.showBeforeAfter}
      </button>
    </div>
  );
}

