import type { CSSProperties } from 'react';
import type { Node } from '@xyflow/react';

import { traceRingColor } from '../selectors/trace';
import type { StudioAnyNodeData } from '../../../lib/question-bank-studio-graph';
import type { TraceRole } from '../types';

type DecorateStudioNodeOptions = {
  node: Node<StudioAnyNodeData>;
  searchLower: string;
  selectedId: string | null;
  dimOutsidePolicy: boolean;
  hidden: boolean;
  traceRole?: TraceRole;
};

export function isNodeMatchedBySearch(node: Node<StudioAnyNodeData>, searchLower: string): boolean {
  if (searchLower.length === 0) return true;

  if (node.id.toLowerCase().includes(searchLower)) return true;
  if (node.data.kind === 'question') {
    return (
      node.data.questionId.toLowerCase().includes(searchLower) ||
      node.data.fullLabel.toLowerCase().includes(searchLower) ||
      node.data.shortLabel.toLowerCase().includes(searchLower)
    );
  }
  if (node.data.kind === 'section') {
    return (
      node.data.sectionKey.toLowerCase().includes(searchLower) ||
      node.data.label.toLowerCase().includes(searchLower)
    );
  }
  if (node.data.kind === 'domainCluster') {
    return (
      node.data.domainKey.toLowerCase().includes(searchLower) ||
      node.data.label.toLowerCase().includes(searchLower)
    );
  }
  if (node.data.kind === 'identity') {
    return node.data.questionId.toLowerCase().includes(searchLower);
  }
  if (node.data.kind === 'layoutStep') {
    return (
      node.data.label.toLowerCase().includes(searchLower) ||
      node.data.surfaceKey.toLowerCase().includes(searchLower) ||
      node.data.sectionKey.toLowerCase().includes(searchLower)
    );
  }

  return false;
}

export function decorateStudioNode(options: DecorateStudioNodeOptions): Node<StudioAnyNodeData> {
  const { node, searchLower, selectedId, dimOutsidePolicy, hidden, traceRole } = options;
  const matched = isNodeMatchedBySearch(node, searchLower);
  const searchDim = searchLower.length > 0 && !matched;

  let extraStyle: CSSProperties = {};
  if (traceRole) {
    extraStyle = {
      boxShadow: `0 0 0 3px ${traceRingColor(traceRole)}`,
    };
  }
  if (searchLower.length > 0 && matched) {
    extraStyle = {
      ...extraStyle,
      outline: '2px solid var(--glc-orange)',
      outlineOffset: 2,
    };
  }
  if (searchDim) {
    extraStyle = { ...extraStyle, opacity: 0.2 };
  }

  const nextData =
    node.data.kind === 'question'
      ? { ...node.data, applyPolicyDim: dimOutsidePolicy }
      : node.data;

  return {
    ...node,
    hidden,
    selected: node.id === selectedId,
    style: { ...(node.style ?? {}), ...extraStyle },
    data: nextData,
  };
}
