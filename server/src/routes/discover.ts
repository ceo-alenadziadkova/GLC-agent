/**
 * Discovery session routes — Mode C (public questionnaire, no auth for submit/load).
 *
 * POST /api/discover               — public — save session, return token
 * GET  /api/discover/sessions      — consultant — list sessions (ordered by created_at DESC)
 * GET  /api/discover/:token        — public — load a session by token
 * PATCH /api/discover/:token/contact — public — add/update contact info
 * POST /api/discover/:token/convert — consultant — create audit from session
 */
import { Router } from 'express';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import { intakePublicLimiter } from '../middleware/rate-limit.js';
import { NO_PUBLIC_WEBSITE_URL } from '../config/no-public-website.js';
import { saveBriefResponses } from '../services/brief-validator.js';
import { DOMAIN_KEYS, REVIEW_AFTER_PHASES, reviewPhasesForMode } from '../types/audit.js';
import { logger } from '../services/logger.js';

export const discoverRouter = Router();

const TOKEN_HEX = /^[a-f0-9]{40}$/i;

// ── Answer → intake-brief mapping ────────────────────────────────────────────

type BriefEntry = { value: unknown; source: 'client' };

function discoveryToBriefPatch(answers: Record<string, unknown>): Record<string, BriefEntry> {
  const tag = (v: unknown): BriefEntry => ({ value: v, source: 'client' });
  const patch: Record<string, BriefEntry> = {};

  // Industry maps directly to intake_industry
  if (typeof answers.industry === 'string' && answers.industry.trim()) {
    patch.intake_industry = tag(answers.industry.trim());
  }

  // CRM detection: crm_name wins over lead_tracking if tools had CRM
  const tools = Array.isArray(answers.tools_daily) ? (answers.tools_daily as string[]) : [];
  const hasCrmTool = tools.some(t => t.includes('CRM'));
  if (hasCrmTool) {
    const name = typeof answers.crm_name === 'string' ? answers.crm_name.trim() : '';
    patch.uses_crm = tag(name || 'Yes');
  } else if (typeof answers.lead_tracking === 'string') {
    const lt = answers.lead_tracking;
    if (lt.includes('CRM') || lt.includes('dedicated')) {
      patch.uses_crm = tag('Yes');
    } else {
      patch.uses_crm = tag('No');
    }
  }

  // Biggest pain: prefer manual_bottleneck (specific), fall back to biggest_challenge
  const manual = typeof answers.manual_bottleneck === 'string' ? answers.manual_bottleneck.trim() : '';
  const challenge = typeof answers.biggest_challenge === 'string' ? answers.biggest_challenge.trim() : '';
  if (manual) patch.biggest_pain = tag(manual);
  else if (challenge) patch.biggest_pain = tag(challenge);

  // Primary goal from biggest_challenge
  if (challenge) patch.primary_goal = tag(challenge);

  // Traffic / acquisition channels
  const acq = Array.isArray(answers.client_acquisition) ? (answers.client_acquisition as string[]) : [];
  const SOURCE_MAP: Record<string, string> = {
    'Word of mouth / referrals': 'Direct / referral',
    'Social media': 'Social media',
    'Google search': 'Organic search (SEO)',
    'Paid ads': 'Paid ads (Google/Meta)',
    'Outbound (cold calls / messages)': 'Direct / referral',
  };
  const mappedSources = [...new Set(acq.flatMap(a => (SOURCE_MAP[a] ? [SOURCE_MAP[a]] : [])))];
  if (mappedSources.length > 0) patch.main_traffic_source = tag(mappedSources);

  return patch;
}

// ── POST /api/discover ────────────────────────────────────────────────────────

discoverRouter.post('/', intakePublicLimiter, async (req, res) => {
  try {
    const { answers, maturity_level, findings } = req.body as {
      answers?: unknown;
      maturity_level?: unknown;
      findings?: unknown;
    };

    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      res.status(400).json({ error: 'answers object is required' });
      return;
    }
    const ml = Number(maturity_level);
    if (!Number.isInteger(ml) || ml < 1 || ml > 4) {
      res.status(400).json({ error: 'maturity_level must be an integer 1–4' });
      return;
    }
    if (!Array.isArray(findings)) {
      res.status(400).json({ error: 'findings must be an array' });
      return;
    }

    const { data: row, error } = await supabase
      .from('discovery_sessions')
      .insert({
        answers,
        maturity_level: ml,
        findings,
      })
      .select('session_token, created_at')
      .single();

    if (error || !row) {
      logger.error('discover.save_failed', { component: 'discover', error: error?.message });
      res.status(500).json({ error: 'Failed to save discovery session' });
      return;
    }

    res.status(201).json({
      token: row.session_token as string,
      created_at: row.created_at as string,
    });
  } catch (err) {
    logger.error('discover.save_exception', { component: 'discover', error: (err as Error).message });
    res.status(500).json({ error: 'Failed to save discovery session' });
  }
});

// ── GET /api/discover/sessions — consultant: list recent submissions ──────────

discoverRouter.get(
  '/sessions',
  requireAuth, attachProfile, requireRole('consultant'),
  async (_req, res) => {
    try {
      const { data, error } = await supabase
        .from('discovery_sessions')
        .select('session_token, maturity_level, findings, contact_name, contact_email, contact_phone, audit_id, created_at')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        logger.error('discover.list_failed', { component: 'discover', error: error.message });
        res.status(500).json({ error: 'Failed to list sessions' });
        return;
      }

      res.json({ sessions: data ?? [] });
    } catch (err) {
      logger.error('discover.list_exception', { component: 'discover', error: (err as Error).message });
      res.status(500).json({ error: 'Failed to list sessions' });
    }
  },
);

// ── GET /api/discover/:token ──────────────────────────────────────────────────

discoverRouter.get('/:token', intakePublicLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || !TOKEN_HEX.test(token)) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }

    const { data: row, error } = await supabase
      .from('discovery_sessions')
      .select('answers, maturity_level, findings, contact_name, contact_email, created_at, audit_id')
      .eq('session_token', token)
      .single();

    if (error || !row) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.json(row);
  } catch (err) {
    logger.error('discover.load_exception', { component: 'discover', error: (err as Error).message });
    res.status(500).json({ error: 'Failed to load session' });
  }
});

// ── PATCH /api/discover/:token/contact — add contact info ────────────────────

discoverRouter.patch('/:token/contact', intakePublicLimiter, async (req, res) => {
  try {
    const { token } = req.params;
    if (!token || !TOKEN_HEX.test(token)) {
      res.status(400).json({ error: 'Invalid token' });
      return;
    }

    const name    = typeof req.body?.contact_name  === 'string' ? req.body.contact_name.trim()  : null;
    const email   = typeof req.body?.contact_email === 'string' ? req.body.contact_email.trim()  : null;
    const phone   = typeof req.body?.contact_phone === 'string' ? req.body.contact_phone.trim()  : null;

    if (!name && !email && !phone) {
      res.status(400).json({ error: 'Provide at least one of contact_name, contact_email, contact_phone' });
      return;
    }

    const patch: Record<string, string | null> = {};
    if (name  !== null) patch.contact_name  = name  || null;
    if (email !== null) patch.contact_email = email || null;
    if (phone !== null) patch.contact_phone = phone || null;

    const { error } = await supabase
      .from('discovery_sessions')
      .update(patch)
      .eq('session_token', token);

    if (error) {
      logger.error('discover.contact_update_failed', { component: 'discover', error: error.message });
      res.status(500).json({ error: 'Failed to save contact info' });
      return;
    }

    res.json({ ok: true as const });
  } catch (err) {
    logger.error('discover.contact_exception', { component: 'discover', error: (err as Error).message });
    res.status(500).json({ error: 'Failed to save contact info' });
  }
});

// ── POST /api/discover/:token/convert — consultant: create audit ──────────────

discoverRouter.post(
  '/:token/convert',
  requireAuth, attachProfile, requireRole('consultant'),
  async (req: AuthRequest, res) => {
    try {
      const { token } = req.params;
      if (!token || !TOKEN_HEX.test(token)) {
        res.status(400).json({ error: 'Invalid token' });
        return;
      }

      const { data: session, error: sErr } = await supabase
        .from('discovery_sessions')
        .select('id, answers, maturity_level, findings, contact_name, audit_id')
        .eq('session_token', token)
        .single();

      if (sErr || !session) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }
      if (session.audit_id) {
        res.status(409).json({ error: 'Session already converted', audit_id: session.audit_id });
        return;
      }

      const answers = (session.answers as Record<string, unknown>) ?? {};
      const industry = typeof answers.industry === 'string' ? answers.industry.trim() : null;
      const companyName = session.contact_name as string | null;

      // Create audit with no public website (Mode C)
      const { data: audit, error: aErr } = await supabase
        .from('audits')
        .insert({
          user_id: req.userId!,
          company_url: NO_PUBLIC_WEBSITE_URL,
          company_name: companyName || null,
          industry: industry || null,
          product_mode: 'full',
        })
        .select('id')
        .single();

      if (aErr || !audit) {
        logger.error('discover.convert_audit_failed', { component: 'discover', error: aErr?.message });
        res.status(500).json({ error: 'Failed to create audit' });
        return;
      }

      const auditId = audit.id as string;
      const reviewPhases = reviewPhasesForMode('full');

      // Pre-create child records
      await Promise.all([
        supabase.from('review_points').insert(reviewPhases.map(phase => ({ audit_id: auditId, after_phase: phase }))),
        supabase.from('audit_domains').insert(DOMAIN_KEYS.map((key, i) => ({ audit_id: auditId, domain_key: key, phase_number: i + 1 }))),
        supabase.from('audit_recon').insert({ audit_id: auditId }),
        supabase.from('audit_strategy').insert({ audit_id: auditId }),
      ]);

      // Map discovery answers → intake brief
      const briefPatch = discoveryToBriefPatch(answers);
      if (Object.keys(briefPatch).length > 0) {
        try {
          await saveBriefResponses(auditId, briefPatch);
        } catch (briefErr) {
          logger.warn('discover.convert_brief_skipped', {
            component: 'discover',
            error: (briefErr as Error).message,
          });
        }
      }

      // Link session to audit
      await supabase
        .from('discovery_sessions')
        .update({ audit_id: auditId })
        .eq('id', session.id);

      logger.info('discover.converted', { component: 'discover', audit_id: auditId, session_token: token });
      res.status(201).json({ audit_id: auditId });
    } catch (err) {
      logger.error('discover.convert_exception', { component: 'discover', error: (err as Error).message });
      res.status(500).json({ error: 'Failed to convert session' });
    }
  },
);
