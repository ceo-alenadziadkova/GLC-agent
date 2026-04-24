import '@xyflow/react/dist/style.css';

import { useEffect, useId, useRef, type MouseEvent } from 'react';
import { ArrowsOut } from '@phosphor-icons/react';
import {
  Background,
  ControlButton,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
} from '@xyflow/react';

import {
  ORCHESTRATION_PACK_GRAPH_FLOW_CAMERA,
  ORCHESTRATION_PACK_GRAPH_FLOW_LAYOUT,
  ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT,
} from '../../config/orchestration-pack-graph-flow.config';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import type { PortalPackGraphNodeData } from '../../lib/build-orchestration-pack-flow-graph';
import { PORTAL_PACK_GRAPH_FLOW_NODE_TYPE } from '../../lib/build-orchestration-pack-flow-graph';
import { cn } from '../ui/utils';
import { PortalPackGraphNode } from './PortalPackGraphNode';

const nodeTypes = { [PORTAL_PACK_GRAPH_FLOW_NODE_TYPE]: PortalPackGraphNode };

export type PortalPackGraphSelection =
  | { kind: 'node'; id: string }
  | { kind: 'edge'; from: string; to: string };

function FitViewWhenLayoutChanges({ layoutKey }: { layoutKey: string }) {
  const { fitView } = useReactFlow();
  useEffect(() => {
    void fitView({
      padding: ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT.fitViewPadding,
      duration: ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT.fitViewAnimationDurationMs,
      maxZoom: ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT.fitViewMaxZoom,
    });
  }, [layoutKey, fitView]);
  return null;
}

function FocusPackGraphSelection({
  flowLayoutKey,
  selection,
}: {
  flowLayoutKey: string;
  selection: PortalPackGraphSelection | null;
}) {
  const { fitView, setCenter, getNode } = useReactFlow();
  const layoutKeyRef = useRef(flowLayoutKey);
  useEffect(() => {
    const layoutJustChanged = layoutKeyRef.current !== flowLayoutKey;
    layoutKeyRef.current = flowLayoutKey;
    if (layoutJustChanged) {
      return;
    }
    if (!selection) {
      return;
    }
    if (selection.kind === 'node') {
      const node = getNode(selection.id);
      if (!node) {
        return;
      }
      const { nodeWidthPx, nodeHeightPx } = ORCHESTRATION_PACK_GRAPH_FLOW_LAYOUT;
      const x = node.position.x + nodeWidthPx / 2;
      const y = node.position.y + nodeHeightPx / 2;
      setCenter(x, y, {
        zoom: ORCHESTRATION_PACK_GRAPH_FLOW_CAMERA.centerOnSelectZoom,
        duration: ORCHESTRATION_PACK_GRAPH_FLOW_CAMERA.centerOnSelectDurationMs,
      });
      return;
    }
    const a = getNode(selection.from);
    const b = getNode(selection.to);
    if (a && b) {
      void fitView({
        nodes: [{ id: selection.from }, { id: selection.to }],
        padding: ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT.fitViewEdgePairPadding,
        duration: ORCHESTRATION_PACK_GRAPH_FLOW_CAMERA.centerOnSelectDurationMs,
        maxZoom: ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT.fitViewEdgePairMaxZoom,
      });
    }
  }, [flowLayoutKey, selection, getNode, setCenter, fitView]);
  return null;
}

function FitViewControlButton() {
  const { fitView } = useReactFlow();
  return (
    <ControlButton
      onClick={() =>
        void fitView({
          padding: ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT.fitViewPadding,
          duration: ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT.fitViewAnimationDurationMs,
          maxZoom: ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT.fitViewMaxZoom,
        })
      }
      title={ORCHESTRATION_UI_COPY.timelinePackGraphFitViewControl}
      aria-label={ORCHESTRATION_UI_COPY.timelinePackGraphFitViewControl}
      className="ds-portal-pack-graph-fit-control"
    >
      <ArrowsOut className="h-4 w-4" aria-hidden />
    </ControlButton>
  );
}

type PortalPackGraphFlowCanvasProps = {
  nodes: Node<PortalPackGraphNodeData>[];
  edges: Edge[];
  /** Changes when pack topology or expanded mode changes — triggers fitView, not highlight-only updates. */
  flowLayoutKey: string;
  flowEdgesTruncated: boolean;
  nodesDroppedFromBudget: number;
  selection: PortalPackGraphSelection | null;
  onSelectionChange: (next: PortalPackGraphSelection | null) => void;
  canvasMinHeightPx: number;
};

function PortalPackGraphFlowCanvasInner(props: PortalPackGraphFlowCanvasProps) {
  const {
    nodes: initialNodes,
    edges: initialEdges,
    flowLayoutKey,
    selection,
    onSelectionChange,
    canvasMinHeightPx,
  } = props;
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(
      initialNodes.map(n => {
        const selected =
          selection?.kind === 'node'
            ? selection.id === n.id
            : selection?.kind === 'edge'
              ? selection.from === n.id || selection.to === n.id
              : false;
        return {
          ...n,
          selected,
        };
      }),
    );
    setEdges(
      initialEdges.map(edge => {
        const edgeFocused =
          selection?.kind === 'edge' && edge.source === selection.from && edge.target === selection.to;
        return {
          ...edge,
          selected: Boolean(edgeFocused),
          className: cn(edge.className, edgeFocused ? 'ds-portal-pack-graph-edge--selected' : ''),
        };
      }),
    );
  }, [flowLayoutKey, initialNodes, initialEdges, selection, setNodes, setEdges]);

  const handleNodeClick = (_event: MouseEvent, node: Node<PortalPackGraphNodeData>) => {
    const next =
      selection?.kind === 'node' && selection.id === node.id ? null : { kind: 'node' as const, id: node.id };
    onSelectionChange(next);
  };

  const handleEdgeClick = (_event: MouseEvent, edge: Edge) => {
    const next =
      selection?.kind === 'edge' && selection.from === edge.source && selection.to === edge.target
        ? null
        : { kind: 'edge' as const, from: edge.source, to: edge.target };
    onSelectionChange(next);
  };

  const handlePaneClick = () => {
    onSelectionChange(null);
  };

  const flowHintId = useId();

  return (
    <div className="relative" aria-describedby={flowHintId}>
      <p id={flowHintId} className="sr-only">
        {ORCHESTRATION_UI_COPY.timelinePackGraphInteractiveAriaLabel}. {ORCHESTRATION_UI_COPY.timelinePackGraphSrKeyboardHint}
      </p>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onEdgeClick={handleEdgeClick}
        onPaneClick={handlePaneClick}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable
        minZoom={ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT.minZoom}
        maxZoom={ORCHESTRATION_PACK_GRAPH_FLOW_VIEWPORT.maxZoom}
        panOnScroll
        zoomOnScroll
        proOptions={{ hideAttribution: true }}
        className="ds-portal-pack-graph-flow rounded-md border border-[var(--border-default)]"
        style={{
          minHeight: canvasMinHeightPx,
        }}
        aria-label={ORCHESTRATION_UI_COPY.timelinePackGraphInteractiveAriaLabel}
      >
        <Background gap={20} size={1} className="ds-portal-pack-graph-flow-bg" />
        <Controls showInteractive={false} className="ds-portal-pack-graph-controls" position="bottom-right">
          <FitViewControlButton />
        </Controls>
        <MiniMap className="ds-portal-pack-graph-minimap" pannable zoomable />
        <FitViewWhenLayoutChanges layoutKey={flowLayoutKey} />
        <FocusPackGraphSelection flowLayoutKey={flowLayoutKey} selection={selection} />
      </ReactFlow>
    </div>
  );
}

export function PortalPackGraphFlowCanvas(props: PortalPackGraphFlowCanvasProps) {
  if (props.nodes.length === 0) {
    return null;
  }
  return (
    <div className="mt-4 space-y-2">
      <div className="text-sm font-medium ds-text-secondary">
        {ORCHESTRATION_UI_COPY.timelinePackGraphInteractiveTitle}
      </div>
      <p className="text-sm leading-relaxed ds-text-tertiary">
        {ORCHESTRATION_UI_COPY.timelinePackGraphInteractiveHint}
      </p>
      {props.flowEdgesTruncated ? (
        <p className="text-[length:var(--text-2xs)] ds-text-tertiary">
          {ORCHESTRATION_UI_COPY.timelinePackGraphFlowEdgesTruncated}
        </p>
      ) : null}
      {props.nodesDroppedFromBudget > 0 ? (
        <p className="text-[length:var(--text-2xs)] ds-text-tertiary">
          {ORCHESTRATION_UI_COPY.timelinePackGraphFlowNodesTruncated}
        </p>
      ) : null}
      <ReactFlowProvider>
        <PortalPackGraphFlowCanvasInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}
