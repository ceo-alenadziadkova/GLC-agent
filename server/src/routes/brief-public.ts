import crypto from 'node:crypto';
import { Router } from 'express';
import { currentIntakeVersionTuple, buildIntakePlan } from '@glc/intake-core';
import { supabase } from '../services/supabase.js';
import { resolveFrontendBaseUrl } from '../config/frontend-url.js';
import { logger } from '../services/logger.js';
import { saveBriefResponses } from '../services/brief-validator.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import {
  briefPublicCreateLimiter,
  briefPublicReadLimiter,
  briefPublicWriteLimiter,
} from '../middleware/rate-limit.js';
import { getPlatformIntakeTokenTtlDays } from '../lib/platform-runtime-settings.js';
import { INTAKE_TOKEN_HEX_REGEX, INTAKE_TOKEN_RANDOM_BYTES } from '../config/intake-token.js';
import {
  BriefResponsesSchema,
  getBriefQuestionsByIds,
  INTAKE_IDENTITY_BRIEF_QUESTIONS,
} from '../schemas/intake-brief.js';
import {
  API_ERROR_CODES,
  INTAKE_AUDIT_ID_REQUIRED_MESSAGE,
  INTAKE_AUDIT_NOT_FOUND_MESSAGE,
  INTAKE_LINK_AUDIT_FAILED_MESSAGE,
  INTAKE_LINK_EXPIRED_MESSAGE,
  INTAKE_LINK_NOT_FOUND_MESSAGE,
  INTAKE_LIST_SUBMISSIONS_FAILED_MESSAGE,
  INTAKE_INVALID_TOKEN_MESSAGE,
  INTAKE_LOAD_FAILED_MESSAGE,
  INTAKE_SAVE_RESPONSES_FAILED_MESSAGE,
  INTAKE_TOKEN_LINKED_CONFLICT_MESSAGE,
  MARKETING_NAME_REQUIRED_MESSAGE,
  MARKETING_SAVE_FAILED_MESSAGE,
  MARKETING_WEBSITE_OR_FLAG_REQUIRED_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';
import { BRIEF_PUBLIC_DEFAULT_RESPONSES, BRIEF_PUBLIC_SUBMISSIONS_LIST_MAX, BRIEF_PUBLIC_TEXT_INPUT_LIMITS } from '../config/public-brief.js';
import { DAY_MS } from '../config/time.js';

export const briefPublicRouter = Router();

function clampStr(value: unknown, max = BRIEF_PUBLIC_TEXT_INPUT_LIMITS.fallbackMax): string {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

const BRIEF_RESPONSE_SOURCES = new Set(['client', 'consultant', 'recon_confirmed', 'unknown']);

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

/** Legacy rows may store primitives; `BriefResponsesSchema` requires v2 cells or null. */
function coerceBriefResponsesToV2Cells(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v === null || v === undefined) {
      out[k] = null;
      continue;
    }
    if (typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
      const c = v as Record<string, unknown>;
      const src = c.source;
      const source =
        typeof src === 'string' && BRIEF_RESPONSE_SOURCES.has(src) ? src : 'client';
      out[k] = { ...c, source };
      continue;
    }
    out[k] = { value: v, source: 'client' };
  }
  return out;
}

function buildBriefQuestionsForResponses(raw: Record<string, unknown>) {
  const plan = buildIntakePlan({
    responses: raw,
    productMode: 'full',
    collectionMode: 'pre_brief',
    surface: 'client_form',
  });
  return {
    questions: [...INTAKE_IDENTITY_BRIEF_QUESTIONS, ...getBriefQuestionsByIds(plan.visible)],
    intake_versions: currentIntakeVersionTuple(),
  };
}

briefPublicRouter.post('/session', briefPublicCreateLimiter, async (req, res) => {
  try {
    const contactName = clampStr(req.body?.contact_name, BRIEF_PUBLIC_TEXT_INPUT_LIMITS.contactNameMax);
    const companyName = clampStr(req.body?.company_name, BRIEF_PUBLIC_TEXT_INPUT_LIMITS.companyNameMax);
    const website = clampStr(req.body?.website_url, BRIEF_PUBLIC_TEXT_INPUT_LIMITS.websiteUrlMax);
    const hasWebsite = Boolean(req.body?.has_website);
    const email = clampStr(req.body?.email, BRIEF_PUBLIC_TEXT_INPUT_LIMITS.emailMax);
    const phone = clampStr(req.body?.phone, BRIEF_PUBLIC_TEXT_INPUT_LIMITS.phoneMax);

    if (!contactName) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.MARKETING_NAME_REQUIRED, MARKETING_NAME_REQUIRED_MESSAGE));
      return;
    }
    if (hasWebsite && !website) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.MARKETING_WEBSITE_OR_FLAG_REQUIRED, MARKETING_WEBSITE_OR_FLAG_REQUIRED_MESSAGE));
      return;
    }

    const responses = toClientEntries({
      a12: companyName || null,
      a5: hasWebsite ? null : BRIEF_PUBLIC_DEFAULT_RESPONSES.noWebsiteAnswer,
      a11: hasWebsite ? website : BRIEF_PUBLIC_DEFAULT_RESPONSES.noWebsiteUrlSentinel,
    });

    const tokenTtlDays = await getPlatformIntakeTokenTtlDays();
    const expiresAt = new Date(Date.now() + tokenTtlDays * DAY_MS).toISOString();
    const intakeVersionTuple = currentIntakeVersionTuple();
    const token = crypto.randomBytes(INTAKE_TOKEN_RANDOM_BYTES).toString('hex');
    const { error } = await supabase.from('public_brief_sessions').insert({
      token,
      contact_name: contactName,
      contact_company: companyName,
      has_website: hasWebsite,
      website_url: hasWebsite ? website : null,
      contact_email: email || null,
      contact_phone: phone || null,
      responses,
      intake_versions: intakeVersionTuple,
      status: 'draft',
      expires_at: expiresAt,
    });
    if (error) {
      logger.error('brief_public.create_failed', { component: 'brief-public', error: error.message });
      res.status(500).json(apiErrorJson(API_ERROR_CODES.MARKETING_SAVE_FAILED, MARKETING_SAVE_FAILED_MESSAGE));
      return;
    }

    const { questions, intake_versions } = buildBriefQuestionsForResponses(responses);
    res.status(201).json({
      session_token: token,
      resume_url: `${resolveFrontendBaseUrl()}/brief?session=${encodeURIComponent(token)}`,
      questions,
      responses,
      intake_versions,
      expires_at: expiresAt,
      submitted_at: null,
    });
  } catch (err) {
    logger.error('brief_public.create_exception', { component: 'brief-public', error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.MARKETING_SAVE_FAILED, MARKETING_SAVE_FAILED_MESSAGE));
  }
});

briefPublicRouter.get('/session/:token', briefPublicReadLimiter, async (req, res) => {
  try {
    const token = String(req.params.token ?? '').trim();
    if (!token || !INTAKE_TOKEN_HEX_REGEX.test(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }
    const { data: row, error } = await supabase
      .from('public_brief_sessions')
      .select('responses, submitted_at, expires_at, status')
      .eq('token', token)
      .maybeSingle();
    if (error || !row) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, INTAKE_LINK_NOT_FOUND_MESSAGE));
      return;
    }
    const exp = new Date(String(row.expires_at ?? '')).getTime();
    if (!Number.isFinite(exp) || Date.now() > exp) {
      res.status(410).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_EXPIRED, INTAKE_LINK_EXPIRED_MESSAGE));
      return;
    }
    const responses = coerceBriefResponsesToV2Cells((row.responses as Record<string, unknown>) ?? {});
    const { questions, intake_versions } = buildBriefQuestionsForResponses(responses);
    res.json({
      session_token: token,
      questions,
      responses,
      submitted_at: (row.submitted_at as string | null) ?? null,
      intake_versions,
      expires_at: row.expires_at as string,
    });
  } catch (err) {
    logger.error('brief_public.get_exception', { component: 'brief-public', error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_LOAD_FAILED, INTAKE_LOAD_FAILED_MESSAGE));
  }
});

briefPublicRouter.patch('/session/:token', briefPublicWriteLimiter, async (req, res) => {
  try {
    const token = String(req.params.token ?? '').trim();
    if (!token || !INTAKE_TOKEN_HEX_REGEX.test(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }
    const coercedBody = coerceBriefResponsesToV2Cells((req.body?.responses ?? {}) as Record<string, unknown>);
    const parsed = BriefResponsesSchema.safeParse(coercedBody);
    if (!parsed.success) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_RESPONSES_SCHEMA_INVALID, parsed.error.message));
      return;
    }
    const { data: row, error: fetchErr } = await supabase
      .from('public_brief_sessions')
      .select('responses, expires_at')
      .eq('token', token)
      .maybeSingle();
    if (fetchErr || !row) {
      res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, INTAKE_LINK_NOT_FOUND_MESSAGE));
      return;
    }
    const exp = new Date(String(row.expires_at ?? '')).getTime();
    if (!Number.isFinite(exp) || Date.now() > exp) {
      res.status(410).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_EXPIRED, INTAKE_LINK_EXPIRED_MESSAGE));
      return;
    }
    const merged = { ...coerceBriefResponsesToV2Cells((row.responses as Record<string, unknown>) ?? {}), ...parsed.data };
    const { error } = await supabase
      .from('public_brief_sessions')
      .update({
        responses: merged,
        intake_versions: currentIntakeVersionTuple(),
      })
      .eq('token', token);
    if (error) {
      logger.error('brief_public.patch_failed', { component: 'brief-public', error: error.message });
      res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_SAVE_RESPONSES_FAILED, INTAKE_SAVE_RESPONSES_FAILED_MESSAGE));
      return;
    }
    const { questions, intake_versions } = buildBriefQuestionsForResponses(merged);
    res.json({ ok: true as const, questions, responses: merged, intake_versions });
  } catch (err) {
    logger.error('brief_public.patch_exception', { component: 'brief-public', error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_SAVE_RESPONSES_FAILED, INTAKE_SAVE_RESPONSES_FAILED_MESSAGE));
  }
});

briefPublicRouter.post('/session/:token/submit', briefPublicWriteLimiter, async (req, res) => {
  try {
    const token = String(req.params.token ?? '').trim();
    if (!token || !INTAKE_TOKEN_HEX_REGEX.test(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
      return;
    }
    const coercedBody = coerceBriefResponsesToV2Cells((req.body?.responses ?? {}) as Record<string, unknown>);
    const parsed = BriefResponsesSchema.safeParse(coercedBody);
    if (!parsed.success) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_RESPONSES_SCHEMA_INVALID, parsed.error.message));
      return;
    }
    const submittedAt = new Date().toISOString();
    const { error } = await supabase
      .from('public_brief_sessions')
      .update({
        responses: parsed.data,
        submitted_at: submittedAt,
        status: 'submitted',
        intake_versions: currentIntakeVersionTuple(),
      })
      .eq('token', token);
    if (error) {
      logger.error('brief_public.submit_failed', { component: 'brief-public', error: error.message });
      res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_SAVE_RESPONSES_FAILED, INTAKE_SAVE_RESPONSES_FAILED_MESSAGE));
      return;
    }
    res.json({ ok: true as const, submitted_at: submittedAt });
  } catch (err) {
    logger.error('brief_public.submit_exception', { component: 'brief-public', error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_SAVE_RESPONSES_FAILED, INTAKE_SAVE_RESPONSES_FAILED_MESSAGE));
  }
});

briefPublicRouter.get(
  '/submissions',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  async (req: AuthRequest, res) => {
    try {
      const { data, error } = await supabase
        .from('public_brief_sessions')
        .select('token, contact_name, contact_company, has_website, website_url, submitted_at, created_at, status, converted_audit_id')
        .not('submitted_at', 'is', null)
        .order('submitted_at', { ascending: false })
        .limit(BRIEF_PUBLIC_SUBMISSIONS_LIST_MAX);
      if (error) {
        logger.error('brief_public.submissions_failed', { component: 'brief-public', error: error.message });
        res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_LIST_SUBMISSIONS_FAILED, INTAKE_LIST_SUBMISSIONS_FAILED_MESSAGE));
        return;
      }
      res.json({ submissions: data ?? [] });
    } catch (err) {
      logger.error('brief_public.submissions_exception', { component: 'brief-public', error: (err as Error).message });
      res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_LIST_SUBMISSIONS_FAILED, INTAKE_LIST_SUBMISSIONS_FAILED_MESSAGE));
    }
  },
);

briefPublicRouter.post(
  '/session/:token/convert',
  requireAuth,
  attachProfile,
  requireRole('consultant'),
  async (req: AuthRequest, res) => {
    try {
      const token = String(req.params.token ?? '').trim();
      const auditId = typeof req.body?.audit_id === 'string' ? req.body.audit_id.trim() : '';
      if (!token || !INTAKE_TOKEN_HEX_REGEX.test(token)) {
        res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_INVALID_TOKEN, INTAKE_INVALID_TOKEN_MESSAGE));
        return;
      }
      if (!auditId) {
        res.status(400).json(apiErrorJson(API_ERROR_CODES.INTAKE_AUDIT_ID_REQUIRED, INTAKE_AUDIT_ID_REQUIRED_MESSAGE));
        return;
      }

      const { data: audit, error: auditErr } = await supabase
        .from('audits')
        .select('id, user_id')
        .eq('id', auditId)
        .single();
      if (auditErr || !audit || audit.user_id !== req.userId) {
        res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_AUDIT_NOT_FOUND, INTAKE_AUDIT_NOT_FOUND_MESSAGE));
        return;
      }

      const { data: session, error: sessionErr } = await supabase
        .from('public_brief_sessions')
        .select('responses, status, converted_audit_id')
        .eq('token', token)
        .maybeSingle();
      if (sessionErr || !session) {
        res.status(404).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_NOT_FOUND, INTAKE_LINK_NOT_FOUND_MESSAGE));
        return;
      }
      if (session.converted_audit_id && session.converted_audit_id !== auditId) {
        res.status(409).json(apiErrorJson(API_ERROR_CODES.INTAKE_TOKEN_LINKED_CONFLICT, INTAKE_TOKEN_LINKED_CONFLICT_MESSAGE));
        return;
      }

      const coercedSession = coerceBriefResponsesToV2Cells((session.responses as Record<string, unknown>) ?? {});
      const parsed = BriefResponsesSchema.safeParse(coercedSession);
      if (parsed.success && Object.keys(parsed.data).length > 0) {
        await saveBriefResponses(auditId, toClientEntries(parsed.data as Record<string, unknown>), {
          validation_perspective: 'consultant',
          collection_mode: 'interview',
        });
      }

      const { error: upErr } = await supabase
        .from('public_brief_sessions')
        .update({
          converted_audit_id: auditId,
          consultant_id: req.userId!,
          converted_at: new Date().toISOString(),
          status: 'converted',
        })
        .eq('token', token);
      if (upErr) {
        logger.error('brief_public.convert_update_failed', { component: 'brief-public', error: upErr.message });
        res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_AUDIT_FAILED, INTAKE_LINK_AUDIT_FAILED_MESSAGE));
        return;
      }

      res.status(201).json({ audit_id: auditId });
    } catch (err) {
      logger.error('brief_public.convert_exception', { component: 'brief-public', error: (err as Error).message });
      res.status(500).json(apiErrorJson(API_ERROR_CODES.INTAKE_LINK_AUDIT_FAILED, INTAKE_LINK_AUDIT_FAILED_MESSAGE));
    }
  },
);
