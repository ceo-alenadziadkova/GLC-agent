/**
 * Loads latest CONTROL_OBJECT snapshots from prior phases for causal linking.
 * Primary: evaluation_datasets (newest run_number per phase_id).
 * Fallback: pipeline_events event_type = control_object.
 */

import type { ControlObjectV1, PhaseId } from '../schemas/control-object.js';
import type { DomainKey } from '../types/audit.js';
import { phaseIdsStrictlyBefore, phaseOrderIndex } from '../config/phase-order.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { supabase } from './supabase.js';
import { logger } from './logger.js';

function asControlObject(row: unknown): ControlObjectV1 | null {
  if (!row || typeof row !== 'object') return null;
  const o = row as ControlObjectV1;
  if (!o.context?.phase_id || !o.trace) return null;
  return o;
}

/**
 * Returns the latest known CONTROL_OBJECT per phase that strictly precedes `currentDomainKey`.
 */
export async function fetchPriorControlObjectsForPhase(
  auditId: string,
  currentDomainKey: DomainKey
): Promise<Partial<Record<PhaseId, ControlObjectV1>>> {
  const currentIdx = phaseOrderIndex(currentDomainKey);
  if (currentIdx === undefined) return {};

  const out: Partial<Record<PhaseId, ControlObjectV1>> = {};
  const priorPhaseIds = phaseIdsStrictlyBefore(currentDomainKey);

  const { data: evalRows, error: e1 } = await supabase
    .from('evaluation_datasets')
    .select('phase_id, run_number, control_object')
    .eq('audit_id', auditId)
    .order('run_number', { ascending: false });

  if (!e1 && evalRows) {
    const seen = new Set<string>();
    for (const row of evalRows) {
      const pid = row.phase_id as PhaseId;
      if (seen.has(pid)) continue;
      seen.add(pid);
      const idx = phaseOrderIndex(pid);
      if (idx === undefined || idx >= currentIdx) continue;
      const co = asControlObject(row.control_object);
      if (co) out[pid] = co;
    }
  } else if (e1) {
    logger.warn('control_object_history.evaluation_query_failed', {
      component: 'control_object_history',
      audit_id: auditId,
      error: e1.message,
    });
  }

  const stillNeed = priorPhaseIds.filter(p => out[p] === undefined);
  if (stillNeed.length === 0) return out;

  const { data: events, error: e2 } = await supabase
    .from('pipeline_events')
    .select('data')
    .eq('audit_id', auditId)
    .eq('event_type', 'control_object')
    .order('created_at', { ascending: false })
    .limit(SYSTEM_DEFAULTS.routeQueries.controlObjectHistoryEventsLimit);

  if (e2 || !events) {
    if (e2) {
      logger.warn('control_object_history.pipeline_events_failed', {
        component: 'control_object_history',
        audit_id: auditId,
        error: e2.message,
      });
    }
    return out;
  }

  const filled = new Set<PhaseId>(Object.keys(out) as PhaseId[]);
  for (const ev of events) {
    const data = ev.data as Record<string, unknown> | null;
    const coRaw = data?.control_object;
    const co = asControlObject(coRaw);
    if (!co) continue;
    const pid = co.context.phase_id;
    if (!stillNeed.includes(pid) || filled.has(pid)) continue;
    const idx = phaseOrderIndex(pid);
    if (idx === undefined || idx >= currentIdx) continue;
    out[pid] = co;
    filled.add(pid);
    if (stillNeed.every(p => filled.has(p) || out[p] !== undefined)) break;
  }

  return out;
}
