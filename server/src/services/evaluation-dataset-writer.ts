import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { isEvaluationDatasetsInsertEnabled } from '../config/feature-flags.js';
import { sanitizeJsonForEvaluationDataset } from '../lib/evaluation-dataset-sanitize.js';
import type { ControlObjectV1 } from '../schemas/control-object.js';
import type { DomainKey } from '../types/audit.js';
import type { DomainResult } from '../types/audit.js';
import type { RetentionPolicy } from '../types/evaluation-dataset.js';
import { EVALUATION_DATASET_RETENTION_DEFAULT } from '../config/evaluation-dataset-retention.js';

export { sanitizeJsonForEvaluationDataset } from '../lib/evaluation-dataset-sanitize.js';

/** Version string stored on CONTROL_OBJECT.evaluation_link.dataset_version */
export const EVALUATION_DATASET_TABLE_VERSION = 'evaluation_datasets_v1';

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
  if (!isEvaluationDatasetsInsertEnabled()) return;

  const {
    auditId,
    phaseId,
    controlObject,
    rawAgentOutput,
    cleanedOutput,
    retentionPolicy = EVALUATION_DATASET_RETENTION_DEFAULT,
  } = args;

  try {
    const runNumber = await nextRunNumber(auditId, phaseId);
    const safeRaw = sanitizeJsonForEvaluationDataset(
      rawAgentOutput ?? (cleanedOutput as unknown as Record<string, unknown>),
    );
    const safeCleaned = sanitizeJsonForEvaluationDataset(cleanedOutput as unknown as Record<string, unknown>);
    const safeControl = sanitizeJsonForEvaluationDataset(controlObject as unknown as Record<string, unknown>);

    const decisionApplied = controlObject.decision_hint;

    const { data: inserted, error } = await supabase
      .from('evaluation_datasets')
      .insert({
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
      })
      .select('id')
      .maybeSingle();

    if (error) {
      logger.warn('evaluation_datasets.insert_failed', {
        component: 'evaluation_dataset_writer',
        audit_id: auditId,
        phase_id: phaseId,
        run_number: runNumber,
        message: error.message,
      });
      return;
    }

    const rowId = (inserted as { id?: string } | null)?.id;
    if (rowId) {
      controlObject.evaluation_link = {
        evaluation_id: rowId,
        dataset_version: EVALUATION_DATASET_TABLE_VERSION,
      };
      const safeControlWithLink = sanitizeJsonForEvaluationDataset(
        controlObject as unknown as Record<string, unknown>,
      );
      const { error: updateErr } = await supabase
        .from('evaluation_datasets')
        .update({ control_object: safeControlWithLink })
        .eq('id', rowId);

      if (updateErr) {
        logger.warn('evaluation_datasets.control_object_link_update_failed', {
          component: 'evaluation_dataset_writer',
          audit_id: auditId,
          phase_id: phaseId,
          evaluation_id: rowId,
          message: updateErr.message,
        });
      }
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
