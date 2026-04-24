import { supabase } from './supabase.js';
import { logger } from './logger.js';
import { getLatestAcceptedForKey } from './legal-consent.service.js';
import {
  isEvaluationDatasetsExplicitInternalConsentRequired,
  isEvaluationDatasetsInsertEnabled,
} from '../config/feature-flags.js';
import { sanitizeJsonForEvaluationDataset } from '../lib/evaluation-dataset-sanitize.js';
import type { ControlObjectV1, PhaseId } from '../schemas/control-object/index.js';
import type { DomainResult } from '../types/audit.js';
import type { RetentionPolicy } from '../types/evaluation-dataset.js';
import {
  EVALUATION_DATASET_RETENTION_DEFAULT,
  EVALUATION_DATASET_RETENTION_TTL_DAYS,
} from '../config/evaluation-dataset-retention.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';

export { sanitizeJsonForEvaluationDataset } from '../lib/evaluation-dataset-sanitize.js';

/** Version string stored on CONTROL_OBJECT.evaluation_link.dataset_version */
export const EVALUATION_DATASET_TABLE_VERSION = 'evaluation_datasets_v1';
const EVALUATION_DATASET_INSERT_MAX_RETRIES = SYSTEM_DEFAULTS.evaluationDatasets.insertMaxRetries;

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
  phaseId: PhaseId;
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

  if (isEvaluationDatasetsExplicitInternalConsentRequired()) {
    const { data: auditOwner, error: ownerErr } = await supabase
      .from('audits')
      .select('user_id')
      .eq('id', args.auditId)
      .maybeSingle();

    if (ownerErr || !auditOwner?.user_id) {
      logger.warn('evaluation_datasets.owner_lookup_failed', {
        component: 'evaluation_dataset_writer',
        audit_id: args.auditId,
        message: ownerErr?.message ?? 'missing_user_id',
      });
      return;
    }

    const evalConsent = await getLatestAcceptedForKey(auditOwner.user_id, 'evaluation_internal');
    if (evalConsent !== true) {
      logger.info('evaluation_datasets.skipped_no_evaluation_consent', {
        component: 'evaluation_dataset_writer',
        audit_id: args.auditId,
        user_id: auditOwner.user_id,
      });
      return;
    }
  }

  const {
    auditId,
    phaseId,
    controlObject,
    rawAgentOutput,
    cleanedOutput,
    retentionPolicy = EVALUATION_DATASET_RETENTION_DEFAULT,
  } = args;

  try {
    const safeRaw = sanitizeJsonForEvaluationDataset(
      rawAgentOutput ?? (cleanedOutput as unknown as Record<string, unknown>),
    );
    const safeCleaned = sanitizeJsonForEvaluationDataset(cleanedOutput as unknown as Record<string, unknown>);
    const safeControl = sanitizeJsonForEvaluationDataset(controlObject as unknown as Record<string, unknown>);

    const decisionApplied = controlObject.decision_hint;
    const agentVariantId = controlObject.context.selected_variant_id ?? null;
    const createdAt = new Date();
    const ttlDays = EVALUATION_DATASET_RETENTION_TTL_DAYS[retentionPolicy];
    const expiresAt = new Date(createdAt.getTime() + ttlDays * 86_400_000);

    let inserted: { id?: string } | null = null;
    for (let attempt = 1; attempt <= EVALUATION_DATASET_INSERT_MAX_RETRIES; attempt++) {
      const runNumber = await nextRunNumber(auditId, phaseId);
      const { data, error } = await supabase
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
          agent_variant_id: agentVariantId,
          retention_policy: retentionPolicy,
          pii_sanitized: true,
          created_at: createdAt.toISOString(),
          expires_at: expiresAt.toISOString(),
        })
        .select('id')
        .maybeSingle();

      if (!error) {
        inserted = data as { id?: string } | null;
        break;
      }

      if (error.code === '23505' && attempt < EVALUATION_DATASET_INSERT_MAX_RETRIES) {
        logger.warn('evaluation_datasets.insert_run_number_conflict_retry', {
          component: 'evaluation_dataset_writer',
          audit_id: auditId,
          phase_id: phaseId,
          attempt,
          message: error.message,
        });
        continue;
      }

      logger.warn('evaluation_datasets.insert_failed', {
        component: 'evaluation_dataset_writer',
        audit_id: auditId,
        phase_id: phaseId,
        run_number: runNumber,
        attempt,
        message: error.message,
      });
      return;
    }

    const rowId = inserted?.id;
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
