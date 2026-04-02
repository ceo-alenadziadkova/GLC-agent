/**
 * Pre-brief public intake: consultant creates token; client loads and submits without auth.
 */
import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import { intakePublicLimiter } from '../middleware/rate-limit.js';
import {
  BRIEF_QUESTIONS,
  INTAKE_IDENTITY_BRIEF_QUESTIONS,
  INTAKE_IDENTITY_FIELD_IDS,
  PRE_BRIEF_QUESTION_IDS,
  BriefResponsesSchema,
} from '../schemas/intake-brief.js';
import { arePreBriefSlotsSatisfied, saveBriefResponses } from '../services/brief-validator.js';
import { logger } from '../services/logger.js';
import { notifyAuditParticipants, notifyUser } from '../services/notifications.js';

export const intakeRouter = Router();

const TOKEN_HEX = /^[a-f0-9]{40}$/i;

function toClientEntries(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
      out[k] = { ...(v as Record<string, unknown>), source: 'client' };
    } else {
      out[k] = { value: v, source: 'client' };
    }
  }
  return out;
}

/** Merges pre-brief question keys from parsed token responses into the audit's intake_brief. */
async function mergePreBriefFromParsedResponses(
  auditId: string,
  consultantUserId: string,
  parsed: Record<string, unknown>,
): Promise<void> {
  const { data: auditRow, error: auditErr } = await supabase
    .from('audits')
    .select('user_id')
    .eq('id', auditId)
    .single();
  if (auditErr || !auditRow || auditRow.user_id !== consultantUserId) {
    throw new Error('audit_ownership_mismatch');
  }

  const { data: brief } = await supabase
    .from('intake_brief')
    .select('responses')
    .eq('audit_id', auditId)
    .maybeSingle();
  const existing = (brief?.responses as Record<string, unknown>) ?? {};
  const preBriefPatch: Record<string, unknown> = {};
  const entries = toClientEntries(parsed);
  const mergeIds = new Set<string>([...PRE_BRIEF_QUESTION_IDS, ...INTAKE_IDENTITY_FIELD_IDS]);
  for (const id of mergeIds) {
    if (entries[id] !== undefined) preBriefPatch[id] = entries[id];
  }
  if (Object.keys(preBriefPatch).length === 0) return;
  await saveBriefResponses(auditId, { ...existing, ...preBriefPatch });
}

/** POST /api/intake — consultant creates token */
intakeRouter.post('/', requireAuth, attachProfile, requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const audit_id = req.body.audit_id;
    const metadata = req.body.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
      ? req.body.metadata as Record<string, unknown>
      : {};

    if (audit_id != null && typeof audit_id !== 'string') {
      res.status(400).json({ error: 'audit_id must be a string UUID when provided' });
      return;
    }

    if (audit_id) {
      const { data: audit, error: aErr } = await supabase
        .from('audits')
        .select('id, user_id')
        .eq('id', audit_id)
        .single();
      if (aErr || !audit || audit.user_id !== req.userId) {
        res.status(404).json({ error: 'Audit not found' });
        return;
      }
    }

    const { data: row, error } = await supabase
      .from('intake_tokens')
      .insert({
        consultant_id: req.userId!,
        audit_id: audit_id ?? null,
        metadata,
      })
      .select('token, expires_at')
      .single();

    if (error || !row) {
      logger.error('intake.create_failed', { component: 'intake', error: error?.message });
      res.status(500).json({ error: 'Failed to create intake link' });
      return;
    }

    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const base = frontend.replace(/\/$/, '');
    res.status(201).json({
      token: row.token as string,
      url: `${base}/intake/${row.token}`,
      expires_at: row.expires_at as string,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.create_exception', { component: 'intake', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to create intake link' });
  }
});

/**
 * POST /api/intake/link-audit — consultant ties a pre-brief token to an audit and merges any
 * already-submitted client answers into intake_brief (fixes tokens created without audit_id).
 */
intakeRouter.post('/link-audit', requireAuth, attachProfile, requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const token = typeof req.body?.token === 'string' ? req.body.token.trim() : '';
    const audit_id = typeof req.body?.audit_id === 'string' ? req.body.audit_id.trim() : '';
    if (!token || !TOKEN_HEX.test(token)) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }
    if (!audit_id) {
      res.status(400).json({ error: 'audit_id is required' });
      return;
    }

    const { data: tokRow, error: tErr } = await supabase
      .from('intake_tokens')
      .select('id, audit_id, consultant_id, responses')
      .eq('token', token)
      .single();

    if (tErr || !tokRow) {
      res.status(404).json({ error: 'Token not found' });
      return;
    }
    if (tokRow.consultant_id !== req.userId) {
      res.status(403).json({ error: 'Not allowed' });
      return;
    }
    const existingAudit = tokRow.audit_id as string | null;
    if (existingAudit && existingAudit !== audit_id) {
      res.status(409).json({ error: 'This link is already linked to another audit' });
      return;
    }

    const { data: audit, error: aErr } = await supabase
      .from('audits')
      .select('id, user_id')
      .eq('id', audit_id)
      .single();
    if (aErr || !audit || audit.user_id !== req.userId) {
      res.status(404).json({ error: 'Audit not found' });
      return;
    }

    const { error: upErr } = await supabase
      .from('intake_tokens')
      .update({ audit_id })
      .eq('id', tokRow.id);

    if (upErr) {
      logger.error('intake.link_audit_update_failed', { component: 'intake', error: upErr.message });
      res.status(500).json({ error: 'Failed to link token' });
      return;
    }

    const rawResponses = tokRow.responses as Record<string, unknown>;
    const parsed = BriefResponsesSchema.safeParse(rawResponses);
    if (parsed.success && Object.keys(parsed.data).length > 0) {
      try {
        await mergePreBriefFromParsedResponses(audit_id, req.userId!, parsed.data as Record<string, unknown>);
      } catch (mergeErr) {
        logger.warn('intake.link_audit_merge_skipped', {
          component: 'intake',
          error: (mergeErr as Error).message,
        });
      }
    }

    res.json({ ok: true as const });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.link_audit_exception', { component: 'intake', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to link intake token' });
  }
});

/**
 * GET /api/intake/submissions — consultant: pre-brief rows this user created where the client
 * already submitted (for admin queue / ops review before or after linking to an audit).
 */
intakeRouter.get('/submissions', requireAuth, attachProfile, requireRole('consultant'), async (req: AuthRequest, res) => {
  try {
    const { data: rows, error } = await supabase
      .from('intake_tokens')
      .select('token, metadata, responses, submitted_at, expires_at, audit_id')
      .eq('consultant_id', req.userId!)
      .not('submitted_at', 'is', null)
      .order('submitted_at', { ascending: false })
      .limit(100);

    if (error) {
      logger.error('intake.submissions_list_failed', { component: 'intake', error: error.message });
      res.status(500).json({ error: 'Failed to list submissions' });
      return;
    }

    const frontend = process.env.FRONTEND_URL ?? 'http://localhost:5173';
    const base = frontend.replace(/\/$/, '');
    const submissions = (rows ?? []).map(r => ({
      token: r.token as string,
      metadata: (r.metadata as Record<string, unknown>) ?? {},
      responses: (r.responses as Record<string, unknown>) ?? {},
      submitted_at: r.submitted_at as string,
      expires_at: r.expires_at as string,
      audit_id: (r.audit_id as string | null) ?? null,
      intake_url: `${base}/intake/${r.token as string}`,
    }));

    res.json({ submissions });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.submissions_exception', { component: 'intake', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to list submissions' });
  }
});

/**
 * GET /api/intake/prefill/:token — consultant-only; same payload as public GET but does not reject
 * expired links. Used when opening New Audit from the request queue so client answers still load.
 */
intakeRouter.get(
  '/prefill/:token',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  async (req: AuthRequest, res) => {
    try {
      const token = String(req.params.token ?? '').trim();
      if (!token || !TOKEN_HEX.test(token)) {
        res.status(400).json({ error: 'Invalid token' });
        return;
      }

      const { data: row, error } = await supabase
        .from('intake_tokens')
        .select('metadata, responses, submitted_at, expires_at, consultant_id')
        .eq('token', token)
        .single();

      if (error || !row) {
        res.status(404).json({ error: 'Link not found' });
        return;
      }
      if (row.consultant_id !== req.userId) {
        res.status(403).json({ error: 'Not allowed' });
        return;
      }

      // Same question bundle as public GET: identity + pre-brief core (see GET /api/intake/:token).
      const preBriefSet = new Set(PRE_BRIEF_QUESTION_IDS);
      const coreQuestions = BRIEF_QUESTIONS.filter(q => preBriefSet.has(q.id));
      const questions = [...INTAKE_IDENTITY_BRIEF_QUESTIONS, ...coreQuestions];
      const expMs = new Date(row.expires_at as string).getTime();
      const linkExpired = !Number.isFinite(expMs) || Date.now() > expMs;

      res.json({
        metadata: (row.metadata as Record<string, unknown>) ?? {},
        questions,
        responses: (row.responses as Record<string, unknown>) ?? {},
        submitted_at: (row.submitted_at as string | null) ?? null,
        expires_at: row.expires_at as string,
        link_expired: linkExpired,
      });
    } catch (err) {
      const e = err as Error;
      logger.error('intake.prefill_get_exception', { component: 'intake', error: e.message, stack: e.stack });
      res.status(500).json({ error: 'Failed to load intake prefill' });
    }
  }
);

/** GET /api/intake/:token — public */
intakeRouter.get('/:token', intakePublicLimiter, async (req, res) => {
  try {
    const token = String(req.params.token ?? '');
    if (!token || !TOKEN_HEX.test(token)) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }

    const { data: row, error } = await supabase
      .from('intake_tokens')
      .select('metadata, responses, submitted_at, expires_at')
      .eq('token', token)
      .single();

    if (error || !row) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

    const exp = new Date(row.expires_at as string).getTime();
    if (!Number.isFinite(exp) || Date.now() > exp) {
      res.status(410).json({ error: 'This link has expired' });
      return;
    }

    // Public client pre-brief must always include identity (website, name, industry, Other specify)
    // even though those keys are not duplicated in the consultant full-brief question list.
    const preBriefSet = new Set(PRE_BRIEF_QUESTION_IDS);
    const coreQuestions = BRIEF_QUESTIONS.filter(q => preBriefSet.has(q.id));
    const questions = [...INTAKE_IDENTITY_BRIEF_QUESTIONS, ...coreQuestions];

    res.json({
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      questions,
      responses: (row.responses as Record<string, unknown>) ?? {},
      submitted_at: (row.submitted_at as string | null) ?? null,
      expires_at: row.expires_at as string,
    });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.public_get_exception', { component: 'intake', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to load intake link' });
  }
});

/** POST /api/intake/:token/respond — public; overwrites responses until expiry */
intakeRouter.post('/:token/respond', intakePublicLimiter, async (req, res) => {
  try {
    const token = String(req.params.token ?? '');
    if (!token || !TOKEN_HEX.test(token)) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }

    const { data: row, error: fetchErr } = await supabase
      .from('intake_tokens')
      .select('id, audit_id, consultant_id, expires_at')
      .eq('token', token)
      .single();

    if (fetchErr || !row) {
      res.status(404).json({ error: 'Link not found' });
      return;
    }

    const exp = new Date(row.expires_at as string).getTime();
    if (!Number.isFinite(exp) || Date.now() > exp) {
      res.status(410).json({ error: 'This link has expired' });
      return;
    }

    const body = req.body?.responses;
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      res.status(400).json({ error: 'responses object is required' });
      return;
    }

    const parsed = BriefResponsesSchema.safeParse(body);
    if (!parsed.success) {
      res.status(400).json({ error: `Invalid responses: ${parsed.error.message}` });
      return;
    }

    if (!arePreBriefSlotsSatisfied(parsed.data as Record<string, unknown>)) {
      res.status(400).json({
        error: 'Pre-brief incomplete. If you selected Other for industry, describe your sector in the follow-up field.',
      });
      return;
    }

    const submittedAt = new Date().toISOString();
    const { error: upErr } = await supabase
      .from('intake_tokens')
      .update({
        responses: parsed.data,
        submitted_at: submittedAt,
      })
      .eq('id', row.id);

    if (upErr) {
      logger.error('intake.respond_update_failed', { component: 'intake', error: upErr.message });
      res.status(500).json({ error: 'Failed to save responses' });
      return;
    }

    const auditId = row.audit_id as string | null;
    if (auditId) {
      try {
        await mergePreBriefFromParsedResponses(auditId, row.consultant_id as string, parsed.data as Record<string, unknown>);
      } catch (mergeErr) {
        const reason = (mergeErr as Error).message === 'audit_ownership_mismatch' ? 'audit_ownership_mismatch' : 'merge_error';
        logger.warn('intake.brief_merge_skipped', {
          component: 'intake',
          reason,
          error: (mergeErr as Error).message,
        });
      }
    }

    const responseCount = Object.keys(parsed.data as Record<string, unknown>).length;
    if (auditId) {
      await notifyAuditParticipants(
        auditId,
        'intake',
        'Intake responses updated',
        `Client submitted pre-brief responses (${responseCount} fields).`,
        {
          token,
          submitted_at: submittedAt,
        },
      );
    } else {
      await notifyUser({
        userId: row.consultant_id as string,
        auditId: null,
        kind: 'intake',
        title: 'New intake submission',
        message: `Client submitted pre-brief responses (${responseCount} fields).`,
        payload: {
          token,
          submitted_at: submittedAt,
        },
      });
    }

    res.json({ ok: true as const, submitted_at: submittedAt });
  } catch (err) {
    const e = err as Error;
    logger.error('intake.respond_exception', { component: 'intake', error: e.message, stack: e.stack });
    res.status(500).json({ error: 'Failed to save responses' });
  }
});
