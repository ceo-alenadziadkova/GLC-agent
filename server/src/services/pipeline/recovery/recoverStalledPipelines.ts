import { pipelineOrchestratorCopy, interpolateOrchestratorMessage } from '../../../config/pipeline-orchestrator-copy.js';
import { PIPELINE_EVENT_TYPES } from '../../../config/pipeline-event-types.js';
import { MS_PER_MINUTE, STALLED_PHASE_ACTIVE_STATUSES } from '../../../config/pipeline-orchestrator-constants.js';
import { SYSTEM_DEFAULTS } from '../../../config/system-defaults.js';
import { supabase } from '../../supabase.js';
import { logger } from '../../logger.js';

const STALLED_PHASE_TIMEOUT_MIN = SYSTEM_DEFAULTS.pipelineOrchestrator.stalledPhaseTimeoutMin;

export async function recoverStalledPipelines(timeoutMinutes = STALLED_PHASE_TIMEOUT_MIN): Promise<number> {
  const cutoff = new Date(Date.now() - timeoutMinutes * MS_PER_MINUTE).toISOString();

  const { data: stuck, error } = await supabase
    .from('audits')
    .select('id,current_phase,status')
    .in('status', [...STALLED_PHASE_ACTIVE_STATUSES])
    .lt('updated_at', cutoff);

  if (error) {
    logger.error('pipeline.recover_stalled_load_failed', { error: error.message, timeout_minutes: timeoutMinutes });
    return 0;
  }

  if (!stuck || stuck.length === 0) return 0;

  const ocStall = pipelineOrchestratorCopy();

  for (const audit of stuck) {
    await supabase.from('pipeline_events').insert({
      audit_id: audit.id,
      phase: Number(audit.current_phase ?? -1),
      event_type: PIPELINE_EVENT_TYPES.phaseStalled,
      message: interpolateOrchestratorMessage(ocStall.recoverStalled.messageTemplate, {
        timeout_minutes: timeoutMinutes,
      }),
      data: {
        timeout_minutes: timeoutMinutes,
        previous_status: audit.status,
      },
    });
    await supabase.from('audits').update({ status: 'failed' }).eq('id', audit.id);
  }

  return stuck.length;
}

