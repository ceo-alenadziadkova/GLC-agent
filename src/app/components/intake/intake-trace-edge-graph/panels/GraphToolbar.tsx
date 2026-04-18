import { INTAKE_TRACE_EDGE_GRAPH_UI_COPY } from '../config/graph-copy';
import { Button } from '../../../ui/button';

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
  const secondaryButtonClassName = 'h-auto px-2 py-1 text-xs';
  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`${secondaryButtonClassName} ${props.pathOnlyMode ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
        onClick={props.onTogglePathOnlyMode}
      >
        {props.pathOnlyMode ? copy.showFullGraph : copy.showPathOnly}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`${secondaryButtonClassName} ${props.isFocusedSubtreeCollapsed ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
        onClick={props.onToggleCollapseFocused}
        disabled={!props.canCollapseFocused}
      >
        {props.isFocusedSubtreeCollapsed ? copy.expandFocusedSubtree : copy.collapseFocusedSubtree}
      </Button>
      <Button type="button" variant="outline" size="sm" className={secondaryButtonClassName} onClick={props.onExpandAll}>
        {copy.expandAllSubtrees}
      </Button>
      <Button type="button" variant="outline" size="sm" className={secondaryButtonClassName} onClick={props.onExportSvg}>
        {copy.exportSvg}
      </Button>
      <Button type="button" variant="outline" size="sm" className={secondaryButtonClassName} onClick={props.onClearSelection}>
        {copy.clearMultiSelect}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`${secondaryButtonClassName} ${props.hasPinnedFocus ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
        onClick={props.onTogglePin}
        disabled={!props.canPinFocused}
      >
        {props.isCurrentFocusPinned ? copy.unpinPath : copy.pinFocusedPath}
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={`${secondaryButtonClassName} ${props.showBeforeAfter ? 'ring-1 ring-[var(--glc-accent)]' : ''}`}
        onClick={props.onToggleShowBeforeAfter}
      >
        {props.showBeforeAfter ? copy.hideBeforeAfter : copy.showBeforeAfter}
      </Button>
    </div>
  );
}

