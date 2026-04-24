import '@xyflow/react/dist/style.css';

import { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  type Edge,
  type Node,
} from '@xyflow/react';
import { getIntakeIntelligenceContract, QUESTION_BANK_V1_IDS } from '@glc/intake-core';

const MAX_EDGES = 12;

/**
 * Read-only mini graph: first N question→signal edges (pilot graph preview, not full bank force-layout).
 */
export function StudioDependencyGraphFlowPreview() {
  const { nodes, edges } = useMemo(() => {
    const outEdges: Edge[] = [];
    const qOrder: string[] = [];
    const sOrder: string[] = [];
    for (const id of Array.from(QUESTION_BANK_V1_IDS).sort((a, b) => a.localeCompare(b))) {
      if (outEdges.length >= MAX_EDGES) break;
      const c = getIntakeIntelligenceContract(id);
      for (const sc of c.signalContribution ?? []) {
        if (!sc?.signalKey || outEdges.length >= MAX_EDGES) break;
        const sk = sc.signalKey;
        if (!qOrder.includes(id)) {
          qOrder.push(id);
        }
        if (!sOrder.includes(sk)) {
          sOrder.push(sk);
        }
        outEdges.push({
          id: `e-${id}-${sk}-${outEdges.length}`,
          source: `q-${id}`,
          target: `s-${sk}`,
        });
      }
    }
    const outNodes: Node[] = [
      ...qOrder.map((id, i) => ({
        id: `q-${id}`,
        type: 'default' as const,
        position: { x: i * 110, y: 0 },
        data: { label: id },
      })),
      ...sOrder.map((sk, i) => ({
        id: `s-${sk}`,
        type: 'default' as const,
        position: { x: i * 130, y: 130 },
        data: { label: sk },
      })),
    ];
    return { nodes: outNodes, edges: outEdges };
  }, []);

  if (edges.length === 0) {
    return null;
  }

  return (
    <div className="h-[min(320px,40vh)] w-full rounded-lg border border-[var(--ds-border-subtle)] overflow-hidden bg-[var(--ds-bg-elevated)]">
      <ReactFlowProvider>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          nodesDraggable={false}
          nodesConnectable={false}
          elementsSelectable={false}
          proOptions={{ hideAttribution: true }}
          minZoom={0.4}
          maxZoom={1.2}
        >
          <Background gap={12} size={0.5} color="var(--ds-border-subtle)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  );
}
