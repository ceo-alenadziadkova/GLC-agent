/**
 * Pre-brief public intake: consultant creates token; client loads and submits without auth.
 */
import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import { intakePublicLimiter } from '../middleware/rate-limit.js';
import {
  BRIEF_QUESTIONS,
  PRE_BRIEF_QUESTION_IDS,
  BriefResponsesSchema,
} from '../schemas/intake-brief.js';
import { saveBriefResponses } from '../services/brief-validator.js';

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
      console.error('[POST /api/intake]', error);
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
    console.error('[POST /api/intake]', err);
    res.status(500).json({ error: 'Failed to create intake link' });
  }
});

/** GET /api/intake/:token — public */
intakeRouter.get('/:token', intakePublicLimiter, async (req, res) => {
  try {
    const { token } = req.params;
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

    const preBriefSet = new Set(PRE_BRIEF_QUESTION_IDS);
    const questions = BRIEF_QUESTIONS.filter(q => preBriefSet.has(q.id));

    res.json({
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      questions,
      responses: (row.responses as Record<string, unknown>) ?? {},
      submitted_at: (row.submitted_at as string | null) ?? null,
      expires_at: row.expires_at as string,
    });
  } catch (err) {
    console.error('[GET /api/intake/:token]', err);
    res.status(500).json({ error: 'Failed to load intake link' });
  }
});

/** POST /api/intake/:token/respond — public; overwrites responses until expiry */
intakeRouter.post('/:token/respond', intakePublicLimiter, async (req, res) => {
  try {
    const { token } = req.params;
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

    const submittedAt = new Date().toISOString();
    const { error: upErr } = await supabase
      .from('intake_tokens')
      .update({
        responses: parsed.data,
        submitted_at: submittedAt,
      })
      .eq('id', row.id);

    if (upErr) {
      console.error('[POST intake respond] token update', upErr);
      res.status(500).json({ error: 'Failed to save responses' });
      return;
    }

    const auditId = row.audit_id as string | null;
    if (auditId) {
      try {
        // Ownership check: verify the audit belongs to the consultant who created this token.
        const { data: auditRow, error: auditErr } = await supabase
          .from('audits')
          .select('user_id')
          .eq('id', auditId)
          .single();
        if (auditErr || !auditRow || auditRow.user_id !== (row.consultant_id as string)) {
          console.warn('[POST intake respond] brief merge skipped: audit ownership mismatch for token');
          res.json({ ok: true as const, submitted_at: submittedAt });
          return;
        }

        const { data: brief } = await supabase
          .from('intake_brief')
          .select('responses')
          .eq('audit_id', auditId)
          .maybeSingle();
        const existing = (brief?.responses as Record<string, unknown>) ?? {};
        const preBriefPatch: Record<string, unknown> = {};
        const entries = toClientEntries(parsed.data as Record<string, unknown>);
        for (const id of PRE_BRIEF_QUESTION_IDS) {
          if (entries[id] !== undefined) preBriefPatch[id] = entries[id];
        }
        await saveBriefResponses(auditId, { ...existing, ...preBriefPatch });
      } catch (mergeErr) {
        console.warn('[POST intake respond] brief merge skipped:', (mergeErr as Error).message);
      }
    }

    res.json({ ok: true as const, submitted_at: submittedAt });
  } catch (err) {
    console.error('[POST /api/intake/:token/respond]', err);
    res.status(500).json({ error: 'Failed to save responses' });
  }
});
