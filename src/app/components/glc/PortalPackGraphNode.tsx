import { Handle, Position, type NodeProps } from '@xyflow/react';

import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import type { PortalPackGraphNodeData } from '../../lib/build-orchestration-pack-flow-graph';

export function PortalPackGraphNode({ data, selected }: NodeProps<PortalPackGraphNodeData>) {
  return (
    <div
      className={`ds-portal-pack-graph-node rounded-md border px-2 py-1.5 shadow-sm${selected ? ' ds-portal-pack-graph-node--selected' : ''}`}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="ds-portal-pack-graph-handle"
        aria-label={ORCHESTRATION_UI_COPY.timelinePackGraphHandleTargetAria}
      />
      <div className="flex flex-col gap-0.5 min-w-0">
        <div className="text-[length:var(--text-2xs)] font-medium leading-snug ds-text-primary line-clamp-2">
          {data.title}
        </div>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[length:var(--text-2xs)] ds-text-tertiary">{data.laneShortLabel}</span>
          {data.onCriticalPath ? (
            <span className="rounded px-1 py-0.5 text-[length:var(--text-2xs)] font-medium ds-portal-pack-graph-cp-pill">
              {ORCHESTRATION_UI_COPY.timelinePackGraphCriticalPathBadge}
            </span>
          ) : null}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="ds-portal-pack-graph-handle"
        aria-label={ORCHESTRATION_UI_COPY.timelinePackGraphHandleSourceAria}
      />
    </div>
  );
}
