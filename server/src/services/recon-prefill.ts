/**
 * After Phase 0 recon: fill `intake_brief.recon_prefills` for client confirm flows (e.g. c1).
 */
import { supabase } from './supabase.js';
import { logger } from './logger.js';

function summarizeTechStack(techStack: Record<string, unknown> | null | undefined): string {
  if (!techStack || typeof techStack !== 'object') return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(techStack)) {
    if (Array.isArray(v) && v.length > 0) {
      parts.push(`${k}: ${v.join(', ')}`);
    }
  }
  return parts.join('; ');
}

/**
 * Merges recon-derived stack summary into `recon_prefills.c1` without overwriting non-empty client edits.
 */
export async function writeReconPrefillsAfterPhase0(auditId: string, techStack: Record<string, unknown>): Promise<void> {
  const detected = summarizeTechStack(techStack).trim();
  if (!detected) return;

  const { data: row, error: selErr } = await supabase
    .from('intake_brief')
    .select('recon_prefills')
    .eq('audit_id', auditId)
    .maybeSingle();

  if (selErr) {
    logger.warn('recon_prefill.select_failed', { component: 'recon_prefill', auditId, error: selErr.message });
    return;
  }

  const prev = (row?.recon_prefills as Record<string, unknown>) ?? {};
  const next = {
    ...prev,
    c1: {
      ...((prev.c1 as Record<string, unknown>) ?? {}),
      detected,
      updated_at: new Date().toISOString(),
    },
  };

  const { error: upErr } = await supabase
    .from('intake_brief')
    .update({ recon_prefills: next })
    .eq('audit_id', auditId);

  if (upErr) {
    logger.warn('recon_prefill.update_failed', { component: 'recon_prefill', auditId, error: upErr.message });
  }
}
