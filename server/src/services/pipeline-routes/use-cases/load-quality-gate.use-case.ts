import { pipelineRouteErr } from '../domain/pipeline-route.errors.js';
import type { PipelineQualityGateResult } from '../domain/pipeline-route.types.js';
import { fetchAuditForAnyAccess } from '../repository/pipeline-audit.repository.js';
import { fetchLatestQualityGateEventData } from '../repository/pipeline-event.repository.js';

export async function loadQualityGateData(params: {
  auditId: string;
  userId: string;
  phase: number;
}): Promise<PipelineQualityGateResult> {
  const { auditId, userId, phase } = params;
  const audit = await fetchAuditForAnyAccess(auditId, userId);
  if (!audit) return { ok: false, error: pipelineRouteErr.auditNotFound() };
  const data = await fetchLatestQualityGateEventData(auditId, phase);
  return { ok: true, data };
}
