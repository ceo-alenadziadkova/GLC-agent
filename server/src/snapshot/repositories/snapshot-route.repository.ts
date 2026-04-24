import { supabase } from '../../services/supabase.js';
import { FREE_SNAPSHOT_PRODUCT_MODE } from '../../types/audit.js';
import { SNAPSHOT_DOMAIN_KEY, SNAPSHOT_PHASE_NUMBER } from '../config/snapshot-runtime.js';

export async function findFreeSnapshotAuditByToken(snapshotToken: string) {
  return supabase
    .from('audits')
    .select('id, client_id, created_at, product_mode, snapshot_token, status, company_url, company_name')
    .eq('snapshot_token', snapshotToken)
    .eq('product_mode', FREE_SNAPSHOT_PRODUCT_MODE)
    .single();
}

export async function claimAuditByIdIfUnclaimed(auditId: string, userId: string) {
  return supabase
    .from('audits')
    .update({ client_id: userId })
    .eq('id', auditId)
    .eq('product_mode', FREE_SNAPSHOT_PRODUCT_MODE)
    .is('client_id', null)
    .select('id')
    .maybeSingle();
}

export async function readAuditClientById(auditId: string) {
  return supabase
    .from('audits')
    .select('id, client_id')
    .eq('id', auditId)
    .single();
}

export async function updateGuestSessionClaimed(snapshotToken: string, userId: string) {
  return supabase
    .from('snapshot_guest_sessions')
    .update({
      status: 'claimed',
      claimed_by_user_id: userId,
      claimed_at: new Date().toISOString(),
    })
    .eq('snapshot_token', snapshotToken);
}

export async function insertFreeSnapshotAudit(params: {
  companyUrl: string;
  snapshotToken: string;
  ownerUserId: string;
  executionPlan: unknown;
  tokenBudget: number;
}) {
  return supabase
    .from('audits')
    .insert({
      company_url: params.companyUrl,
      product_mode: FREE_SNAPSHOT_PRODUCT_MODE,
      execution_plan: params.executionPlan,
      snapshot_token: params.snapshotToken,
      origin: 'snapshot',
      token_budget: params.tokenBudget,
      user_id: params.ownerUserId,
      client_id: null,
    })
    .select('id')
    .single();
}

export async function initSnapshotAuditChildren(auditId: string) {
  return Promise.allSettled([
    supabase.from('audit_recon').insert({ audit_id: auditId }),
    supabase.from('audit_domains').insert({
      audit_id: auditId,
      domain_key: SNAPSHOT_DOMAIN_KEY,
      phase_number: SNAPSHOT_PHASE_NUMBER,
    }),
  ]);
}

export async function rollbackAuditOnInitFailure(auditId: string) {
  return supabase.from('audits').delete().eq('id', auditId);
}

export async function loadSnapshotReconAndUx(auditId: string) {
  return Promise.all([
    supabase.from('audit_recon').select('company_name, tech_stack, location, pages_crawled').eq('audit_id', auditId).single(),
    supabase
      .from('audit_domains')
      .select('score, label, summary, issues, quick_wins, raw_data')
      .eq('audit_id', auditId)
      .eq('domain_key', SNAPSHOT_DOMAIN_KEY)
      .order('version', { ascending: false })
      .limit(1)
      .single(),
  ] as const);
}

export async function invalidateSnapshotToken(auditId: string) {
  return supabase
    .from('audits')
    .update({ snapshot_token: null })
    .eq('id', auditId)
    .eq('product_mode', FREE_SNAPSHOT_PRODUCT_MODE);
}

