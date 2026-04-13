import { EVALUATION_DATASET_RETENTION_TTL_DAYS } from '../config/evaluation-dataset-retention.js';
import { SYSTEM_DEFAULTS } from '../config/system-defaults.js';
import { logger } from '../services/logger.js';
import { supabase } from '../services/supabase.js';

const SINGLETON_ID = 1;

function asPositiveIntOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : null;
}

export async function getPlatformIntakeTokenTtlDays(): Promise<number> {
  const fallback = SYSTEM_DEFAULTS.intake.tokenTtlDays;
  const { data, error } = await supabase
    .from('platform_settings')
    .select('intake_token_ttl_days')
    .eq('id', SINGLETON_ID)
    .maybeSingle();

  if (error) {
    logger.warn('platform_runtime_settings.intake_ttl_read_failed', {
      component: 'platform_runtime_settings',
      error: error.message,
    });
    return fallback;
  }

  return asPositiveIntOrNull(data?.intake_token_ttl_days) ?? fallback;
}

export async function getPlatformEvaluationRetentionTtlDays(): Promise<{
  default: number;
  extended: number;
  internal_only: number;
}> {
  const fallback = EVALUATION_DATASET_RETENTION_TTL_DAYS;
  const { data, error } = await supabase
    .from('platform_settings')
    .select(
      'evaluation_retention_default_days, evaluation_retention_extended_days, evaluation_retention_internal_only_days',
    )
    .eq('id', SINGLETON_ID)
    .maybeSingle();

  if (error) {
    logger.warn('platform_runtime_settings.evaluation_retention_read_failed', {
      component: 'platform_runtime_settings',
      error: error.message,
    });
    return fallback;
  }

  return {
    default: asPositiveIntOrNull(data?.evaluation_retention_default_days) ?? fallback.default,
    extended: asPositiveIntOrNull(data?.evaluation_retention_extended_days) ?? fallback.extended,
    internal_only:
      asPositiveIntOrNull(data?.evaluation_retention_internal_only_days) ?? fallback.internal_only,
  };
}

export type PlatformRuntimePolicyPatch = {
  intake_token_ttl_days?: number | null;
  evaluation_retention_default_days?: number | null;
  evaluation_retention_extended_days?: number | null;
  evaluation_retention_internal_only_days?: number | null;
};

export async function getPlatformRuntimePolicySnapshot(): Promise<{
  intake_token_ttl_days: number;
  evaluation_retention_default_days: number;
  evaluation_retention_extended_days: number;
  evaluation_retention_internal_only_days: number;
}> {
  const intakeTokenTtlDays = await getPlatformIntakeTokenTtlDays();
  const retention = await getPlatformEvaluationRetentionTtlDays();
  return {
    intake_token_ttl_days: intakeTokenTtlDays,
    evaluation_retention_default_days: retention.default,
    evaluation_retention_extended_days: retention.extended,
    evaluation_retention_internal_only_days: retention.internal_only,
  };
}

export async function setPlatformRuntimePolicyPatch(
  patch: PlatformRuntimePolicyPatch,
  updatedBy: string,
): Promise<{ ok: true } | { ok: false; error: string; statusCode: number }> {
  const { error } = await supabase
    .from('platform_settings')
    .update({
      ...patch,
      updated_by: updatedBy,
    })
    .eq('id', SINGLETON_ID);
  if (error) {
    return { ok: false, statusCode: 500, error: error.message };
  }
  return { ok: true };
}
