import { INTAKE_TRACE_GRAPH_CONFIG } from '../config/graph-config';
import type { GraphLayout, NodePos } from '../types';

export function buildGraphLayout(visibleLayers: string[][]): GraphLayout {
  const layoutConfig = INTAKE_TRACE_GRAPH_CONFIG.layout;
  const positions = new Map<string, NodePos>();
  const maxRows = Math.max(1, ...visibleLayers.map(layer => layer.length));
  const width =
    layoutConfig.marginX * 2 +
    Math.max(1, visibleLayers.length) * layoutConfig.nodeWidth +
    Math.max(0, visibleLayers.length - 1) * layoutConfig.hGap;
  const height =
    layoutConfig.marginY * 2 + maxRows * layoutConfig.nodeHeight + Math.max(0, maxRows - 1) * layoutConfig.vGap;

  visibleLayers.forEach((layerIds, layerIndex) => {
    const x = layoutConfig.marginX + layerIndex * (layoutConfig.nodeWidth + layoutConfig.hGap);
    const totalLayerHeight =
      layerIds.length * layoutConfig.nodeHeight + Math.max(0, layerIds.length - 1) * layoutConfig.vGap;
    const startY = layoutConfig.marginY + Math.max(0, (height - layoutConfig.marginY * 2 - totalLayerHeight) / 2);
    layerIds.forEach((id, rowIndex) => {
      const y = startY + rowIndex * (layoutConfig.nodeHeight + layoutConfig.vGap);
      positions.set(id, { id, x, y, layer: layerIndex });
    });
  });

  return { positions, width, height };
}

export function shortNodeLabel(label: string): string {
  const maxLength = INTAKE_TRACE_GRAPH_CONFIG.labels.maxNodeLabelLength;
  if (label.length <= maxLength) return label;
  return `${label.slice(0, maxLength - 3)}...`;
}

