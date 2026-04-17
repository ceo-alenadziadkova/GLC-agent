import { UI_INTAKE_TRACE_GRAPH } from '../../../../../design-system/tokens/ui-semantic-colors';
import { INTAKE_TRACE_GRAPH_CONFIG } from '../config/graph-config';
import { INTAKE_TRACE_EDGE_GRAPH_UI_COPY } from '../config/graph-copy';
import { shortNodeLabel } from '../domain/layout';
import { statusColors, statusFor } from '../domain/node-status';
import type { Edge, GraphLayout } from '../types';
import type { IntakePlan } from '@glc/intake-core';
import type { RefObject } from 'react';

interface GraphCanvasProps {
  containerRef: RefObject<HTMLDivElement | null>;
  svgRef: RefObject<SVGSVGElement | null>;
  layout: GraphLayout;
  visibleEdges: Edge[];
  visibleNodeIds: string[];
  plan: IntakePlan;
  focusId: string;
  pinnedFocusId: string | null;
  selectedIds: Set<string>;
  showBeforeAfter: boolean;
  resolveLabel: (id: string) => string;
  resolveCanonLabel: (id: string) => string;
  resolveDraftLabel: (id: string) => string | null;
  resolvePublishedLabel?: (id: string) => string | null;
  onFocusIdChange: (id: string) => void;
  onToggleSelected: (id: string) => void;
  onMouseDown: React.MouseEventHandler<HTMLDivElement>;
  onMouseMove: React.MouseEventHandler<HTMLDivElement>;
  onMouseUp: React.MouseEventHandler<HTMLDivElement>;
}

export function GraphCanvas(props: GraphCanvasProps) {
  const copy = INTAKE_TRACE_EDGE_GRAPH_UI_COPY;
  const layoutConfig = INTAKE_TRACE_GRAPH_CONFIG.layout;
  const edgeStroke = UI_INTAKE_TRACE_GRAPH.edgeStroke;
  const focusEdgeStroke = UI_INTAKE_TRACE_GRAPH.focusEdgeStroke;

  return (
    <div
      ref={props.containerRef}
      onMouseDown={props.onMouseDown}
      onMouseMove={props.onMouseMove}
      onMouseUp={props.onMouseUp}
      onMouseLeave={props.onMouseUp}
      className="w-full overflow-auto rounded-lg border border-[var(--glc-border)] bg-[var(--glc-surface)] cursor-grab active:cursor-grabbing"
    >
      <svg ref={props.svgRef} width={props.layout.width} height={props.layout.height} role="img" aria-label={copy.aria.graphLabel}>
        <defs>
          <marker id="trace-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={edgeStroke} />
          </marker>
          <marker id="trace-arrow-focus" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={focusEdgeStroke} />
          </marker>
        </defs>

        {props.visibleEdges.map((edge, index) => {
          const from = props.layout.positions.get(edge.from);
          const to = props.layout.positions.get(edge.to);
          if (!from || !to) return null;
          const x1 = from.x + layoutConfig.nodeWidth;
          const y1 = from.y + layoutConfig.nodeHeight / 2;
          const x2 = to.x;
          const y2 = to.y + layoutConfig.nodeHeight / 2;
          const cx1 = x1 + layoutConfig.hGap * layoutConfig.curveBendFactor;
          const cx2 = x2 - layoutConfig.hGap * layoutConfig.curveBendFactor;
          const activeFocus = props.pinnedFocusId ?? props.focusId;
          const focused =
            edge.from === activeFocus ||
            edge.to === activeFocus ||
            props.selectedIds.has(edge.from) ||
            props.selectedIds.has(edge.to);
          return (
            <path
              key={`${edge.from}-${edge.to}-${index}`}
              d={`M ${x1} ${y1} C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`}
              fill="none"
              stroke={focused ? focusEdgeStroke : edgeStroke}
              strokeWidth={focused ? 2.4 : 1.4}
              opacity={focused ? 0.95 : 0.55}
              markerEnd={focused ? 'url(#trace-arrow-focus)' : 'url(#trace-arrow)'}
            />
          );
        })}

        {props.visibleNodeIds.map(id => {
          const pos = props.layout.positions.get(id);
          if (!pos) return null;
          const status = statusFor(id, props.plan);
          const colors = statusColors(status);
          const activeFocus = props.pinnedFocusId ?? props.focusId;
          const focused = id === activeFocus;
          const selected = props.selectedIds.has(id);
          const label = props.resolveLabel(id);
          const draftLabel = props.resolveDraftLabel(id);
          const publishedLabel = props.resolvePublishedLabel?.(id) ?? null;
          const afterLabel = draftLabel?.trim() || publishedLabel?.trim() || null;
          const canonLabel = props.resolveCanonLabel(id);

          return (
            <g
              key={id}
              style={{ cursor: 'pointer' }}
              onClick={event => {
                props.onFocusIdChange(id);
                if (event.shiftKey || event.metaKey || event.ctrlKey) props.onToggleSelected(id);
              }}
              role="button"
              aria-label={`${copy.aria.focusQuestionPrefix} ${id}`}
            >
              <rect
                x={pos.x}
                y={pos.y}
                rx={10}
                ry={10}
                width={layoutConfig.nodeWidth}
                height={layoutConfig.nodeHeight}
                fill={colors.fill}
                stroke={
                  selected
                    ? UI_INTAKE_TRACE_GRAPH.selectedEdgeStroke
                    : focused
                      ? UI_INTAKE_TRACE_GRAPH.focusedAlternateEdgeStroke
                      : colors.stroke
                }
                strokeWidth={selected ? 3 : focused ? 2.6 : 1.4}
              />
              <text x={pos.x + 10} y={pos.y + 20} fill={colors.text} fontSize={11} fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace">
                {id}
              </text>
              {props.showBeforeAfter && afterLabel ? (
                <>
                  <text x={pos.x + 10} y={pos.y + 34} fill={colors.text} fontSize={9.6} fontFamily="Inter, system-ui, sans-serif" opacity={0.75}>
                    {copy.beforeAfter.before}: {shortNodeLabel(canonLabel)}
                  </text>
                  <text x={pos.x + 10} y={pos.y + 47} fill={colors.text} fontSize={9.6} fontFamily="Inter, system-ui, sans-serif">
                    {copy.beforeAfter.after}: {shortNodeLabel(afterLabel)}
                  </text>
                  <text x={pos.x + 10} y={pos.y + 58} fill={colors.text} opacity={0.85} fontSize={9.2} fontFamily="Inter, system-ui, sans-serif">
                    {status}
                  </text>
                </>
              ) : (
                <>
                  <text x={pos.x + 10} y={pos.y + 39} fill={colors.text} fontSize={10.5} fontFamily="Inter, system-ui, sans-serif">
                    {shortNodeLabel(label)}
                  </text>
                  <text x={pos.x + 10} y={pos.y + 54} fill={colors.text} opacity={0.85} fontSize={9.5} fontFamily="Inter, system-ui, sans-serif">
                    {status}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

