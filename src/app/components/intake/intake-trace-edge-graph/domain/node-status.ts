import type { IntakePlan } from '@glc/intake-core';

import { UI_INTAKE_TRACE_GRAPH } from '../../../../../design-system/tokens/ui-semantic-colors';
import type { NodeStatus } from '../types';

export function statusFor(id: string, plan: IntakePlan): NodeStatus {
  if (plan.required.includes(id)) return 'required';
  if (plan.visible.includes(id)) return 'visible';
  if (plan.deferred.includes(id)) return 'deferred';
  if (plan.hidden.includes(id)) return 'hidden';
  return 'other';
}

export function statusColors(status: NodeStatus): { fill: string; stroke: string; text: string } {
  const nodeByStatus = UI_INTAKE_TRACE_GRAPH.nodeByStatus;
  switch (status) {
    case 'required':
      return nodeByStatus.required;
    case 'visible':
      return nodeByStatus.visible;
    case 'deferred':
      return nodeByStatus.deferred;
    case 'hidden':
      return nodeByStatus.hidden;
    default:
      return nodeByStatus.other;
  }
}

export function sectionKey(id: string): string {
  const first = id[0]?.toUpperCase();
  return /[A-Z]/.test(first ?? '') ? first! : '#';
}

