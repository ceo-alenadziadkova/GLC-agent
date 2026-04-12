import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { sanitizeJsonForEvaluationDataset } from '../lib/evaluation-dataset-sanitize.js';
import type { ControlObjectV1 } from '../schemas/control-object.js';
import type { DomainKey } from '../types/audit.js';
import type { DomainResult } from '../types/audit.js';
import type { RetentionPolicy } from '../types/evaluation-dataset.js';

export { sanitizeJsonForEvaluationDataset } from '../lib/evaluation-dataset-sanitize.js';

async function nextRunNumber(auditId: string, phaseId: string): Promise<number> {
  const { data, error } = await supabase
    .from('evaluation_datasets')
    .select('run_number')
    .eq('audit_id', auditId)
    .eq('phase_id', phaseId)
    .order('run_number', { ascending: false })
    .limit(1);

  if (error) {
    logger.warn('evaluation_datasets.run_number_query_failed', {
      component: 'evaluation_dataset_writer',
      audit_id: auditId,
      phase_id: phaseId,
      message: error.message,
    });
    return 1;
  }

  const last = data?.[0]?.run_number;
  return typeof last === 'number' && last >= 1 ? last + 1 : 1;
}

export interface RecordEvaluationDatasetArgs {
  auditId: string;
  phaseId: DomainKey;
  controlObject: ControlObjectV1;
  rawAgentOutput: Record<string, unknown> | null;
  cleanedOutput: DomainResult;
  retentionPolicy?: RetentionPolicy;
}

/**
 * Persists one evaluation row after a domain phase completes (advisory).
 * Best-effort: failures are logged and never throw to callers.
 */
export async function recordEvaluationDatasetIfEnabled(args: RecordEvaluationDatasetArgs): Promise<void> {
  if (!SYSTEM_DEFAULTS.evaluationDatasets.insertEnabled) return;

  const {
    auditId,
    phaseId,
    controlObject,
    rawAgentOutput,
    cleanedOutput,
    retentionPolicy = 'default',
  } = args;

  try {
    const runNumber = await nextRunNumber(auditId, phaseId);
    const safeRaw = sanitizeJsonForEvaluationDataset(
      rawAgentOutput ?? (cleanedOutput as unknown as Record<string, unknown>),
    );
    const safeCleaned = sanitizeJsonForEvaluationDataset(cleanedOutput as unknown as Record<string, unknown>);
    const safeControl = sanitizeJsonForEvaluationDataset(controlObject as unknown as Record<string, unknown>);

    const decisionApplied = controlObject.decision_hint;

    const { error } = await supabase.from('evaluation_datasets').insert({
      audit_id: auditId,
      phase_id: phaseId,
      run_number: runNumber,
      control_object: safeControl,
      agent_output: safeRaw,
      cleaned_output: safeCleaned,
      human_feedback: null,
      decision_applied: decisionApplied,
      retention_policy: retentionPolicy,
      pii_sanitized: true,
    });

    if (error) {
      logger.warn('evaluation_datasets.insert_failed', {
        component: 'evaluation_dataset_writer',
        audit_id: auditId,
        phase_id: phaseId,
        run_number: runNumber,
        message: error.message,
      });
    }
  } catch (err) {
    logger.warn('evaluation_datasets.insert_exception', {
      component: 'evaluation_dataset_writer',
      audit_id: auditId,
      phase_id: phaseId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
