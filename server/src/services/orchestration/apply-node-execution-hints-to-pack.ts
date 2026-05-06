import { canonicalNodeKeyFromManifestAndNode } from '@glc/intake-core';

import type { RoadmapManifestPayload } from '../../schemas/roadmap-manifest.js';
import { GlcOrchestrationPackSchema, type GlcOrchestrationPack } from '../../schemas/glc-orchestration-pack.js';
import { roadmapManifestChangeSignature } from '../plan-board/manifest-signature.js';
import { projectOrchestrationLanes } from './orchestration-lane-projection.js';

/** Applies persisted manifest `node_execution_hints` onto pack graph lanes + optional owner_hint. */
export function applyRoadmapNodeExecutionHintsToPack(args: {
  pack: GlcOrchestrationPack;
  manifest: RoadmapManifestPayload;
}): GlcOrchestrationPack {
  const rawHints = args.manifest.node_execution_hints;
  if (!rawHints || Object.keys(rawHints).length === 0) return args.pack;

  const manifestSignature = roadmapManifestChangeSignature(args.manifest);
  const graphNodes = args.pack.graph.nodes.map(node => {
    const canonicalNodeKey = canonicalNodeKeyFromManifestAndNode({
      manifest_signature: manifestSignature,
      lane_id: node.lane,
      title: node.title,
      board_identity_key: node.board_identity_key ?? null,
    });
    const hint = rawHints[canonicalNodeKey];
    if (!hint) return node;

    const nextLane = hint.lane ?? node.lane;
    const next: typeof node = { ...node, lane: nextLane as typeof node.lane };
    if (hint.owner_hint != null) next.owner_hint = hint.owner_hint;

    const laneChanged = nextLane !== node.lane;
    const ownerChanged = hint.owner_hint != null && hint.owner_hint !== (node.owner_hint ?? '');

    return laneChanged || ownerChanged ? next : node;
  });

  const nextPack: GlcOrchestrationPack = {
    ...args.pack,
    graph: {
      ...args.pack.graph,
      nodes: graphNodes,
    },
    lanes: projectOrchestrationLanes(graphNodes),
  };

  return GlcOrchestrationPackSchema.parse(nextPack);
}
