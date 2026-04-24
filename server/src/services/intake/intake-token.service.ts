import crypto from 'node:crypto';

import { logger } from '../logger.js';
import { supabase } from '../supabase.js';
import { INTAKE_TOKEN_RANDOM_BYTES } from '../../config/intake-token.js';
import { DAY_MS } from '../../config/time.js';
import { INTAKE_SUBMISSIONS_LIST_MAX } from '../../config/route-query-limits.js';
import { getPlatformIntakeTokenTtlDays } from '../../lib/platform-runtime-settings.js';

export async function fetchAuditOwnedByConsultant(
  auditId: string,
  consultantUserId: string,
): Promise<{ id: string; user_id: string } | null> {
  const { data: audit, error: aErr } = await supabase
    .from('audits')
    .select('id, user_id')
    .eq('id', auditId)
    .single();
  if (aErr || !audit || audit.user_id !== consultantUserId) return null;
  return audit as { id: string; user_id: string };
}

export async function createConsultantIntakeToken(params: {
  consultantUserId: string;
  auditId: string | null;
  metadata: Record<string, unknown>;
}): Promise<{ token: string; expires_at: string } | null> {
  const tokenTtlDays = await getPlatformIntakeTokenTtlDays();
  const { data: row, error } = await supabase
    .from('intake_tokens')
    .insert({
      token: crypto.randomBytes(INTAKE_TOKEN_RANDOM_BYTES).toString('hex'),
      consultant_id: params.consultantUserId,
      audit_id: params.auditId,
      metadata: params.metadata,
      expires_at: new Date(Date.now() + tokenTtlDays * DAY_MS).toISOString(),
    })
    .select('token, expires_at')
    .single();
  if (error || !row) {
    if (error) {
      logger.error('intake.create_failed', { component: 'intake', error: error.message });
    }
    return null;
  }
  return { token: row.token as string, expires_at: row.expires_at as string };
}

export type IntakeTokenLinkRow = {
  id: string;
  audit_id: string | null;
  consultant_id: string;
  responses: unknown;
};

export async function fetchIntakeTokenRowForLinkAudit(token: string): Promise<IntakeTokenLinkRow | null> {
  const { data: tokRow, error: tErr } = await supabase
    .from('intake_tokens')
    .select('id, audit_id, consultant_id, responses')
    .eq('token', token)
    .single();
  if (tErr || !tokRow) return null;
  return tokRow as IntakeTokenLinkRow;
}

export async function updateIntakeTokenAuditId(tokenTableId: string, auditId: string): Promise<boolean> {
  const { error: upErr } = await supabase.from('intake_tokens').update({ audit_id: auditId }).eq('id', tokenTableId);
  if (upErr) {
    logger.error('intake.link_audit_update_failed', { component: 'intake', error: upErr.message });
  }
  return !upErr;
}

export async function listConsultantSubmittedIntakeTokens(consultantId: string): Promise<{
  rows: Array<Record<string, unknown>> | null;
  errorMessage: string | null;
}> {
  const { data: rows, error } = await supabase
    .from('intake_tokens')
    .select('token, metadata, responses, submitted_at, expires_at, audit_id')
    .eq('consultant_id', consultantId)
    .not('submitted_at', 'is', null)
    .order('submitted_at', { ascending: false })
    .limit(INTAKE_SUBMISSIONS_LIST_MAX);
  if (error) return { rows: null, errorMessage: error.message };
  return { rows: rows ?? [], errorMessage: null };
}

export type PrefillIntakeTokenRow = {
  metadata: unknown;
  responses: unknown;
  submitted_at: unknown;
  expires_at: unknown;
  consultant_id: unknown;
};

export async function fetchIntakeTokenRowForPrefill(token: string): Promise<PrefillIntakeTokenRow | null> {
  const { data: row, error } = await supabase
    .from('intake_tokens')
    .select('metadata, responses, submitted_at, expires_at, consultant_id')
    .eq('token', token)
    .single();
  if (error || !row) return null;
  return row as PrefillIntakeTokenRow;
}

export type PublicIntakeLoadRow = {
  metadata: unknown;
  responses: unknown;
  submitted_at: unknown;
  expires_at: unknown;
};

export async function fetchIntakeTokenRowForPublicLoad(token: string): Promise<PublicIntakeLoadRow | null> {
  const { data: row, error } = await supabase
    .from('intake_tokens')
    .select('metadata, responses, submitted_at, expires_at')
    .eq('token', token)
    .single();
  if (error || !row) return null;
  return row as PublicIntakeLoadRow;
}

export type RespondIntakeTokenRow = {
  id: string;
  audit_id: string | null;
  consultant_id: string;
  expires_at: string;
  responses: unknown;
};

export async function fetchIntakeTokenRowForRespond(token: string): Promise<RespondIntakeTokenRow | null> {
  const { data: row, error: fetchErr } = await supabase
    .from('intake_tokens')
    .select('id, audit_id, consultant_id, expires_at, responses')
    .eq('token', token)
    .single();
  if (fetchErr || !row) return null;
  return row as RespondIntakeTokenRow;
}

export async function updateIntakeTokenResponses(
  id: string,
  responses: Record<string, unknown>,
  submittedAt: string,
): Promise<boolean> {
  const { error: upErr } = await supabase
    .from('intake_tokens')
    .update({
      responses,
      submitted_at: submittedAt,
    })
    .eq('id', id);
  if (upErr) {
    logger.error('intake.respond_update_failed', { component: 'intake', error: upErr.message });
  }
  return !upErr;
}

export async function updateIntakeTokenResponsesDraft(
  id: string,
  responses: Record<string, unknown>,
): Promise<boolean> {
  const { error: upErr } = await supabase
    .from('intake_tokens')
    .update({
      responses,
    })
    .eq('id', id);
  if (upErr) {
    logger.error('intake.nl_describe_draft_update_failed', { component: 'intake', error: upErr.message });
  }
  return !upErr;
}
