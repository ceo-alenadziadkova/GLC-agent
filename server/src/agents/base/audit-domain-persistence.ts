/**
 * Persist domain phase results to `audit_domains` and merge post-audit brief follow-ups.
 */

import { SYSTEM_DEFAULTS } from '../../config/system-defaults.js';
import { followupQuestionsFromUnknowns } from '../../lib/post-audit-followups.js';
import { logger } from '../../services/logger.js';
import { supabase } from '../../services/supabase.js';
import type { DomainKey, DomainResult } from '../../types/audit.js';

import { promptVersion } from './prompt-loader.js';

const { auditDomainsInsertMaxAttemptsOnConflict, postgresUniqueViolationSqlState } =
  SYSTEM_DEFAULTS.agentPersistence;

export async function saveCompletedDomainRow(params: {
  auditId: string;
  domainKey: DomainKey;
  phaseNumber: number;
  result: DomainResult;
}): Promise<void> {
  const { auditId, domainKey, phaseNumber, result } = params;

  const payload = {
    status: 'completed' as const,
    score: result.score,
    label: result.label,
    summary: result.summary,
    strengths: result.strengths,
    weaknesses: result.weaknesses,
    issues: result.issues,
    quick_wins: result.quick_wins,
    recommendations: result.recommendations,
    unknown_items: result.unknown_items ?? [],
    confidence_distribution: result.confidence_distribution ?? null,
    prompt_version: promptVersion(domainKey),
  };

  const { data: updated } = await supabase
    .from('audit_domains')
    .update(payload)
    .eq('audit_id', auditId)
    .eq('domain_key', domainKey)
    .eq('status', 'pending')
    .select('id');

  if (!(updated && updated.length > 0)) {
    for (let attempt = 1; attempt <= auditDomainsInsertMaxAttemptsOnConflict; attempt++) {
      const { data: latest } = await supabase
        .from('audit_domains')
        .select('version')
        .eq('audit_id', auditId)
        .eq('domain_key', domainKey)
        .order('version', { ascending: false })
        .limit(1)
        .single();

      const { error: insertError } = await supabase.from('audit_domains').insert({
        audit_id: auditId,
        domain_key: domainKey,
        phase_number: phaseNumber,
        version: (latest?.version ?? 1) + 1,
        ...payload,
      });
      if (!insertError) break;
      if (insertError.code !== postgresUniqueViolationSqlState || attempt === auditDomainsInsertMaxAttemptsOnConflict) {
        throw insertError;
      }
    }
  }

  await mergePostAuditFollowups({ auditId, domainKey, result });
}

/**
 * Append domain-specific follow-up brief questions from unknown_items (idempotent per domain+id).
 * On select error: logs and skips — avoids corrupting intake state.
 */
export async function mergePostAuditFollowups(params: {
  auditId: string;
  domainKey: DomainKey;
  result: DomainResult;
}): Promise<void> {
  const { auditId, domainKey, result } = params;

  const newQs = followupQuestionsFromUnknowns(domainKey, result.unknown_items ?? []);
  if (newQs.length === 0) return;

  const { data: row, error } = await supabase
    .from('intake_brief')
    .select('post_audit_questions')
    .eq('audit_id', auditId)
    .maybeSingle();

  if (error) {
    logger.warn('agent.merge_post_audit_followups_select_skipped', {
      component: 'agent',
      audit_id: auditId,
      domain_key: domainKey,
      error: error.message,
    });
    return;
  }

  const existing = (row?.post_audit_questions as Array<{ domain?: string; id?: string }>) ?? [];
  const existingKeys = new Set(existing.map((q) => `${q.domain}:${q.id}`));
  const toAdd = newQs.filter((q) => !existingKeys.has(`${q.domain}:${q.id}`));
  if (toAdd.length === 0) return;

  const merged = [...existing, ...toAdd];

  if (!row) {
    await supabase
      .from('intake_brief')
      .insert({ audit_id: auditId, post_audit_questions: merged, responses: {} });
  } else {
    await supabase.from('intake_brief').update({ post_audit_questions: merged }).eq('audit_id', auditId);
  }
}
