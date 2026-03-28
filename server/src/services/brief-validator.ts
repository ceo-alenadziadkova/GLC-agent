/**
 * BriefValidator — validates intake brief completeness.
 *
 * SLA: all 🔴 required questions must be answered before Phase 0 can start.
 * If brief doesn't exist or is incomplete, startPhase(0) throws with a
 * user-friendly message listing the missing questions.
 */
import { supabase } from './supabase.js';
import {
  BRIEF_QUESTIONS,
  REQUIRED_QUESTION_IDS,
  RECOMMENDED_QUESTION_IDS,
  BriefResponsesSchema,
} from '../schemas/intake-brief.js';
import type { IntakeBrief } from '../types/audit.js';

export interface BriefValidationResult {
  passed: boolean;
  sla_met: boolean;
  answered_required: number;
  total_required: number;
  answered_recommended: number;
  total_recommended: number;
  missing_required: Array<{ id: string; question: string }>;
}

function isAnswered(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (typeof value === 'number') return true;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

/**
 * Validates brief completeness without touching the DB.
 */
export function validateBriefResponses(
  responses: Record<string, unknown>
): BriefValidationResult {
  const answeredRequired = REQUIRED_QUESTION_IDS.filter(id => isAnswered(responses[id]));
  const answeredRecommended = RECOMMENDED_QUESTION_IDS.filter(id => isAnswered(responses[id]));

  const missingRequired = REQUIRED_QUESTION_IDS
    .filter(id => !isAnswered(responses[id]))
    .map(id => {
      const q = BRIEF_QUESTIONS.find(q => q.id === id)!;
      return { id, question: q.question };
    });

  const sla_met = missingRequired.length === 0;

  return {
    passed: sla_met,
    sla_met,
    answered_required: answeredRequired.length,
    total_required: REQUIRED_QUESTION_IDS.length,
    answered_recommended: answeredRecommended.length,
    total_recommended: RECOMMENDED_QUESTION_IDS.length,
    missing_required: missingRequired,
  };
}

/**
 * Loads the brief for an audit, updates the DB stats, and returns the
 * validation result. Returns passed=true if the audit is a free_snapshot
 * (no brief required).
 *
 * Throws if product_mode is express/full and SLA is not met.
 */
export async function assertBriefReady(auditId: string): Promise<void> {
  // Check product mode — free_snapshot never needs a brief
  const { data: audit } = await supabase
    .from('audits')
    .select('product_mode')
    .eq('id', auditId)
    .single();

  if (!audit || audit.product_mode === 'free_snapshot') return;

  // Fetch brief
  const { data: brief } = await supabase
    .from('intake_brief')
    .select('*')
    .eq('audit_id', auditId)
    .single();

  const responses = (brief?.responses as Record<string, unknown>) ?? {};
  const validation = validateBriefResponses(responses);

  // Update stats in DB
  await supabase.from('intake_brief').upsert(
    {
      audit_id: auditId,
      responses,
      status: validation.sla_met ? 'submitted' : 'draft',
      sla_met: validation.sla_met,
      answered_required: validation.answered_required,
      answered_recommended: validation.answered_recommended,
    },
    { onConflict: 'audit_id' }
  );

  if (!validation.sla_met) {
    const questions = validation.missing_required.map(q => `• ${q.question}`).join('\n');
    throw new Error(
      `Intake brief incomplete — ${validation.missing_required.length} required question(s) unanswered:\n${questions}`
    );
  }
}

/**
 * Parses and saves brief responses for an audit.
 * Returns the saved IntakeBrief record.
 */
export async function saveBriefResponses(
  auditId: string,
  rawResponses: Record<string, unknown>
): Promise<IntakeBrief> {
  const parsed = BriefResponsesSchema.safeParse(rawResponses);
  if (!parsed.success) {
    throw new Error(`Invalid brief responses: ${parsed.error.message}`);
  }

  const responses = parsed.data;
  const validation = validateBriefResponses(responses as Record<string, unknown>);

  const { data, error } = await supabase
    .from('intake_brief')
    .upsert(
      {
        audit_id: auditId,
        responses,
        status: validation.sla_met ? 'submitted' : 'draft',
        sla_met: validation.sla_met,
        answered_required: validation.answered_required,
        answered_recommended: validation.answered_recommended,
      },
      { onConflict: 'audit_id' }
    )
    .select()
    .single();

  if (error || !data) throw new Error(`Failed to save brief: ${error?.message ?? 'unknown'}`);

  return data as IntakeBrief;
}
