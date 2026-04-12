/**
 * Discovery session routes — Mode C (public questionnaire, no auth for submit/load).
 *
 * POST /api/discover               — public — save session, return token
 * GET  /api/discover/sessions      — consultant — list sessions (ordered by created_at DESC)
 * GET  /api/discover/:token        — public — load a session by token
 * PATCH /api/discover/:token/contact — public — add/update contact info
 * POST /api/discover/:token/convert — consultant — new full audit + intake_brief seeded from discovery answers
 */
import { Router } from 'express';
import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { supabase } from '../services/supabase.js';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import {
  discoverAnalyticsPublicLimiter,
  discoverPublicReadLimiter,
  discoverSessionCreateLimiter,
} from '../middleware/rate-limit.js';
import { NO_PUBLIC_WEBSITE_URL } from '../config/no-public-website.js';
import { DISCOVER_SESSIONS_LIST_MAX } from '../config/route-query-limits.js';
import { saveBriefResponses } from '../services/brief-validator.js';
import { DOMAIN_KEYS, reviewPhasesForMode } from '../types/audit.js';
import { logger } from '../services/logger.js';
import {
  buildPublicDiscoveryUiFragment,
  DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET,
  DISCOVERY_BRIEF_PATCH_C3_ANALYTICS_NOT_ON_SITE,
  DISCOVERY_BRIEF_USES_CRM_NO,
  DISCOVERY_BRIEF_USES_CRM_YES,
  discoveryCnSite1SelectionsImplyFirstPartyWeb,
  inferDiscoveryUsesCrm,
} from '@glc/intake-core';
import { intakeAnalyticsDiscoveryBatchSchema } from '../schemas/intake-analytics-events.js';
import {
  DISCOVER_CONTACT_EDIT_KEY_PATTERN,
  DISCOVER_SESSION_TOKEN_PATTERN,
  isDiscoverMaturityLevel,
} from '../config/discover-contract.js';
import {
  API_ERROR_CODES,
  DISCOVER_ALREADY_CONVERTED_MESSAGE,
  DISCOVER_ANALYTICS_ACCEPT_FAILED_MESSAGE,
  DISCOVER_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
  DISCOVER_ANALYTICS_STORE_FAILED_MESSAGE,
  DISCOVER_ANSWERS_REQUIRED_MESSAGE,
  DISCOVER_CLAIM_CONFLICT_MESSAGE,
  DISCOVER_CONTACT_EDIT_KEY_INVALID_MESSAGE,
  DISCOVER_CONTACT_EMPTY_MESSAGE,
  DISCOVER_CONTACT_FIELDS_REQUIRED_MESSAGE,
  DISCOVER_CONTACT_NOT_ALLOWED_MESSAGE,
  DISCOVER_CONTACT_SAVE_FAILED_MESSAGE,
  DISCOVER_CONVERT_FAILED_MESSAGE,
  DISCOVER_FINDINGS_REQUIRED_MESSAGE,
  DISCOVER_FORBIDDEN_OWNER_MESSAGE,
  DISCOVER_INVALID_TOKEN_MESSAGE,
  DISCOVER_LINK_CONFLICT_MESSAGE,
  DISCOVER_LIST_FAILED_MESSAGE,
  DISCOVER_LOAD_FAILED_MESSAGE,
  DISCOVER_MATURITY_INVALID_MESSAGE,
  DISCOVER_SAVE_FAILED_MESSAGE,
  DISCOVER_SESSION_NOT_FOUND_MESSAGE,
  DISCOVER_UI_FRAGMENT_FAILED_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';

export const discoverRouter = Router();

const scryptAsync = promisify(crypto.scrypt);

function createContactEditKey(): string {
  return crypto.randomBytes(32).toString('hex');
}

function sha256Hex(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

async function hashContactEditKey(raw: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(raw, salt, 64) as Buffer;
  return `v2:${salt}:${derived.toString('hex')}`;
}

async function verifyContactEditKey(raw: string, stored: string): Promise<boolean> {
  if (stored.startsWith('v2:')) {
    const [, salt, expectedHex] = stored.split(':');
    if (!salt || !expectedHex) return false;
    const expected = Buffer.from(expectedHex, 'hex');
    const actual = await scryptAsync(raw, salt, expected.length) as Buffer;
    if (actual.length !== expected.length) return false;
    return crypto.timingSafeEqual(actual, expected);
  }
  // Legacy fallback for existing records created before v2 hashing.
  return sha256Hex(raw) === stored;
}

function singleRouteParam(v: string | string[] | undefined): string {
  if (v === undefined) return '';
  return Array.isArray(v) ? (v[0] ?? '') : v;
}

// ── Answer → intake-brief mapping ────────────────────────────────────────────

type BriefEntry = { value: unknown; source: 'client' | 'unknown' };

/** Canonical question-bank ids used by public discovery (single source: server UI fragment). */
const DISCOVERY_BANK_KEYS = buildPublicDiscoveryUiFragment().questions.map(q => q.id);

function normalizedPresenceFromBank(answers: Record<string, unknown>): string[] {
  const v = answers.c_nosite_1;
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0);
}

/**
 * Maps bank-ID discovery answers (a2, d1, c_nosite_*, …) into brief cells.
 */
function discoveryBankIdsToBriefPatch(answers: Record<string, unknown>): Record<string, BriefEntry> {
  const tag = (v: unknown): BriefEntry => ({ value: v, source: 'client' });
  const unk = (): BriefEntry => ({ value: null, source: 'unknown' });
  const patch: Record<string, BriefEntry> = {};

  for (const key of DISCOVERY_BANK_KEYS) {
    if (key === 'a5') continue;
    const v = answers[key];
    if (v == null) continue;
    if (typeof v === 'string' && !v.trim()) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    patch[key] = tag(v);
  }
  patch.a5 = tag(DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET);

  for (const key of DISCOVERY_BANK_KEYS) {
    const side = `${key}__other`;
    const raw = answers[side];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    if (key === 'a2') {
      patch.intake_industry_specify = tag(raw.trim());
    } else {
      patch[side] = tag(raw.trim());
    }
  }

  const pres = normalizedPresenceFromBank(answers);
  if (pres.length > 0 && !discoveryCnSite1SelectionsImplyFirstPartyWeb(pres)) {
    patch.c3 = tag(DISCOVERY_BRIEF_PATCH_C3_ANALYTICS_NOT_ON_SITE);
  }

  const d1 = Array.isArray(answers.d1) ? (answers.d1 as string[]) : [];
  const crmInference = inferDiscoveryUsesCrm(d1, answers.d1b);
  if (crmInference === 'yes') {
    patch.uses_crm = tag(DISCOVERY_BRIEF_USES_CRM_YES);
  } else if (crmInference === 'no') {
    patch.uses_crm = tag(DISCOVERY_BRIEF_USES_CRM_NO);
  } else {
    patch.uses_crm = unk();
  }

  if (!patch.b1) patch.b1 = unk();
  if (!patch.c5) patch.c5 = unk();
  if (!patch.c3) patch.c3 = unk();
  if (!patch.a6) patch.a6 = unk();

  return patch;
}

/**
 * Maps discovery answers into intake-brief format.
 *
 * Only bank-id shaped discovery payloads are supported (public wizard contract).
 * Pre-bank discovery field names (`industry`, `online_presence`, …) are no longer mapped.
 *
 * Fields we can derive from discovery answers are tagged source:'client'.
 * Required brief fields that cannot be determined from a discovery session
 * are tagged source:'unknown' so the brief-validator counts them as "answered"
 * (consultant-flagged unknowns) and allows the pipeline to start.
 * Monetization is bank id **`a10`** only when present in session answers; no legacy **`revenue_model`** cell is synthesized.
 */
function discoveryToBriefPatch(answers: Record<string, unknown>): Record<string, BriefEntry> {
  return discoveryBankIdsToBriefPatch(answers);
}

type DiscoveryConvertRpcRow = {
  audit_id: string | null;
  error_code: string | null;
  answers: unknown;
};

function parseDiscoveryConvertRpcRow(data: unknown): DiscoveryConvertRpcRow | undefined {
  if (data == null) return undefined;
  const rows = Array.isArray(data) ? data : [data];
  const first = rows[0];
  if (first == null || typeof first !== 'object' || Array.isArray(first)) return undefined;
  const o = first as Record<string, unknown>;
  return {
    audit_id: (o.audit_id as string | null | undefined) ?? null,
    error_code: (o.error_code as string | null | undefined) ?? null,
    answers: o.answers,
  };
}

function coerceDiscoverySessionAnswers(value: unknown): Record<string, unknown> {
  if (value != null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

// ── POST /api/discover ────────────────────────────────────────────────────────

discoverRouter.post('/', discoverSessionCreateLimiter, async (req, res) => {
  try {
    const { answers, maturity_level, findings } = req.body as {
      answers?: unknown;
      maturity_level?: unknown;
      findings?: unknown;
    };

    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_ANSWERS_REQUIRED, DISCOVER_ANSWERS_REQUIRED_MESSAGE));
      return;
    }
    const ml = Number(maturity_level);
    if (!isDiscoverMaturityLevel(ml)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_MATURITY_INVALID, DISCOVER_MATURITY_INVALID_MESSAGE));
      return;
    }
    if (!Array.isArray(findings)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_FINDINGS_REQUIRED, DISCOVER_FINDINGS_REQUIRED_MESSAGE));
      return;
    }

    const contactEditKey = createContactEditKey();
    const contactEditKeyHash = await hashContactEditKey(contactEditKey);
    const { data: row, error } = await supabase
      .from('discovery_sessions')
      .insert({
        answers,
        maturity_level: ml,
        findings,
        contact_edit_key_hash: contactEditKeyHash,
      })
      .select('session_token, created_at')
      .single();

    if (error || !row) {
      logger.error('discover.save_failed', { component: 'discover', error: error?.message });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_SAVE_FAILED, DISCOVER_SAVE_FAILED_MESSAGE));
      return;
    }

    res.status(201).json({
      token: row.session_token as string,
      created_at: row.created_at as string,
      contact_edit_key: contactEditKey,
    });
  } catch (err) {
    logger.error('discover.save_exception', { component: 'discover', error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.DISCOVER_SAVE_FAILED, DISCOVER_SAVE_FAILED_MESSAGE));
  }
});

// ── GET /api/discover/ui-fragment — public — Discovery wizard copy/options ─────
// Must be registered before GET /:token so "ui-fragment" is not parsed as a token.

discoverRouter.get('/ui-fragment', discoverPublicReadLimiter, (_req, res) => {
  try {
    res.json(buildPublicDiscoveryUiFragment());
  } catch (err) {
    logger.error('discover.ui_fragment_failed', {
      component: 'discover',
      error: (err as Error).message,
    });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.DISCOVER_UI_FRAGMENT_FAILED, DISCOVER_UI_FRAGMENT_FAILED_MESSAGE));
  }
});

// ── POST /api/discover/analytics-events — public — intake funnel (ADR Phase G) ─
// Registered before GET /:token so the path is not parsed as a session token.

discoverRouter.post('/analytics-events', discoverAnalyticsPublicLimiter, async (req, res) => {
  try {
    const parsed = intakeAnalyticsDiscoveryBatchSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.DISCOVER_ANALYTICS_PAYLOAD_INVALID,
          DISCOVER_ANALYTICS_PAYLOAD_INVALID_MESSAGE,
          parsed.error.flatten(),
        ),
      );
      return;
    }
    const body = parsed.data;
    const hasTuple =
      body.intake_versions && Object.values(body.intake_versions).some(v => v != null && v !== '');
    let versions: Record<string, unknown> | null = hasTuple ? { ...body.intake_versions } : null;
    if (body.experiment_variant) {
      versions = {
        ...(versions ?? {}),
        experimentVariant: body.experiment_variant,
      };
    }

    const rows = body.events.map(e => ({
      surface: body.surface,
      event_type: e.event_type,
      client_session_id: body.client_session_id,
      discovery_session_token: body.discovery_session_token ?? null,
      question_id: e.question_id ?? null,
      step_index: e.step_index ?? null,
      intake_versions: versions,
      client_ts: e.client_ts ?? null,
    }));

    const { error } = await supabase.from('intake_analytics_events').insert(rows);
    if (error) {
      logger.error('discover.analytics_insert_failed', {
        component: 'discover',
        error: error.message,
      });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_ANALYTICS_STORE_FAILED, DISCOVER_ANALYTICS_STORE_FAILED_MESSAGE));
      return;
    }

    res.status(200).json({ ok: true as const, received: rows.length });
  } catch (err) {
    logger.error('discover.analytics_exception', {
      component: 'discover',
      error: (err as Error).message,
    });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.DISCOVER_ANALYTICS_ACCEPT_FAILED, DISCOVER_ANALYTICS_ACCEPT_FAILED_MESSAGE));
  }
});

// ── GET /api/discover/sessions — consultant: list recent submissions ──────────

discoverRouter.get(
  '/sessions',
  requireAuth, attachProfile, requireRole('consultant'),
  async (req: AuthRequest, res) => {
    try {
      const { data, error } = await supabase
        .from('discovery_sessions')
        .select('session_token, maturity_level, findings, contact_name, contact_email, contact_phone, contact_company, audit_id, created_at, answers, consultant_id')
        .or(`consultant_id.is.null,consultant_id.eq.${req.userId!}`)
        .order('created_at', { ascending: false })
        .limit(DISCOVER_SESSIONS_LIST_MAX);

      if (error) {
        logger.error('discover.list_failed', { component: 'discover', error: error.message });
        res
          .status(500)
          .json(apiErrorJson(API_ERROR_CODES.DISCOVER_LIST_FAILED, DISCOVER_LIST_FAILED_MESSAGE));
        return;
      }

      // Extract display fields from answers JSONB; drop the full answers blob from the response
      const sessions = (data ?? []).map(row => {
        const ans = (row.answers as Record<string, unknown>) ?? {};
        const industryFromBank = typeof ans.a2 === 'string' ? ans.a2.trim() || null : null;
        const bizFromBank = typeof ans.a1 === 'string' ? ans.a1.trim() || null : null;
        const isOwnedByCurrentConsultant = row.consultant_id === req.userId;
        return {
          session_token: row.session_token,
          maturity_level: row.maturity_level,
          findings: row.findings,
          // Unclaimed sessions remain visible for queue triage, but PII is hidden until claimed.
          contact_name:    isOwnedByCurrentConsultant ? row.contact_name : null,
          contact_email:   isOwnedByCurrentConsultant ? row.contact_email : null,
          contact_phone:   isOwnedByCurrentConsultant ? row.contact_phone : null,
          contact_company: isOwnedByCurrentConsultant ? row.contact_company : null,
          audit_id:      row.audit_id,
          created_at:    row.created_at,
          biz_description:
            bizFromBank
            ?? (typeof ans.biz_description === 'string' ? ans.biz_description.trim() || null : null),
          industry:
            industryFromBank
            ?? (typeof ans.industry === 'string' ? ans.industry.trim() || null : null),
          consultant_id: (row.consultant_id as string | null) ?? null,
        };
      });

      res.json({ sessions });
    } catch (err) {
      logger.error('discover.list_exception', { component: 'discover', error: (err as Error).message });
      res.status(500).json(apiErrorJson(API_ERROR_CODES.DISCOVER_LIST_FAILED, DISCOVER_LIST_FAILED_MESSAGE));
    }
  },
);

// ── GET /api/discover/:token ──────────────────────────────────────────────────

discoverRouter.get('/:token', discoverPublicReadLimiter, async (req, res) => {
  try {
    const token = singleRouteParam(req.params.token);
    if (!token || !DISCOVER_SESSION_TOKEN_PATTERN.test(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.DISCOVER_INVALID_TOKEN, DISCOVER_INVALID_TOKEN_MESSAGE));
      return;
    }

    const { data: row, error } = await supabase
      .from('discovery_sessions')
      // Public endpoint: intentionally excludes contact_* PII.
      .select('answers, maturity_level, findings, created_at, audit_id')
      .eq('session_token', token)
      .single();

    if (error || !row) {
      res
        .status(404)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_SESSION_NOT_FOUND, DISCOVER_SESSION_NOT_FOUND_MESSAGE));
      return;
    }

    res.json(row);
  } catch (err) {
    logger.error('discover.load_exception', { component: 'discover', error: (err as Error).message });
    res.status(500).json(apiErrorJson(API_ERROR_CODES.DISCOVER_LOAD_FAILED, DISCOVER_LOAD_FAILED_MESSAGE));
  }
});

// ── PATCH /api/discover/:token/contact — add contact info ────────────────────

discoverRouter.patch('/:token/contact', discoverPublicReadLimiter, async (req, res) => {
  try {
    const token = singleRouteParam(req.params.token);
    if (!token || !DISCOVER_SESSION_TOKEN_PATTERN.test(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.DISCOVER_INVALID_TOKEN, DISCOVER_INVALID_TOKEN_MESSAGE));
      return;
    }

    const contactEditKeyRaw = typeof req.body?.contact_edit_key === 'string'
      ? req.body.contact_edit_key.trim()
      : '';
    if (!DISCOVER_CONTACT_EDIT_KEY_PATTERN.test(contactEditKeyRaw)) {
      res
        .status(403)
        .json(
          apiErrorJson(
            API_ERROR_CODES.DISCOVER_CONTACT_EDIT_KEY_INVALID,
            DISCOVER_CONTACT_EDIT_KEY_INVALID_MESSAGE,
          ),
        );
      return;
    }

    const patch: Record<string, string | null> = {};
    if (typeof req.body?.contact_name === 'string') {
      patch.contact_name = req.body.contact_name.trim() || null;
    }
    if (typeof req.body?.contact_email === 'string') {
      patch.contact_email = req.body.contact_email.trim() || null;
    }
    if (typeof req.body?.contact_phone === 'string') {
      patch.contact_phone = req.body.contact_phone.trim() || null;
    }
    if (typeof req.body?.contact_company === 'string') {
      patch.contact_company = req.body.contact_company.trim() || null;
    }

    if (Object.keys(patch).length === 0) {
      res.status(400).json(
        apiErrorJson(
          API_ERROR_CODES.DISCOVER_CONTACT_FIELDS_REQUIRED,
          DISCOVER_CONTACT_FIELDS_REQUIRED_MESSAGE,
        ),
      );
      return;
    }
    const hasValue = Object.values(patch).some(v => v != null && String(v).length > 0);
    if (!hasValue) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_CONTACT_EMPTY, DISCOVER_CONTACT_EMPTY_MESSAGE));
      return;
    }

    const { data: row, error: loadError } = await supabase
      .from('discovery_sessions')
      .select('id, contact_edit_key_hash, audit_id')
      .eq('session_token', token)
      .maybeSingle();
    if (loadError) {
      logger.error('discover.contact_load_failed', { component: 'discover', error: loadError.message });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_CONTACT_SAVE_FAILED, DISCOVER_CONTACT_SAVE_FAILED_MESSAGE));
      return;
    }
    if (!row || row.audit_id) {
      res
        .status(403)
        .json(
          apiErrorJson(API_ERROR_CODES.DISCOVER_CONTACT_NOT_ALLOWED, DISCOVER_CONTACT_NOT_ALLOWED_MESSAGE),
        );
      return;
    }
    const keyValid = await verifyContactEditKey(contactEditKeyRaw, String(row.contact_edit_key_hash ?? ''));
    if (!keyValid) {
      res
        .status(403)
        .json(
          apiErrorJson(API_ERROR_CODES.DISCOVER_CONTACT_NOT_ALLOWED, DISCOVER_CONTACT_NOT_ALLOWED_MESSAGE),
        );
      return;
    }

    const { data: updated, error } = await supabase
      .from('discovery_sessions')
      .update(patch)
      .eq('session_token', token)
      .is('audit_id', null)
      .select('id')
      .maybeSingle();

    if (error) {
      logger.error('discover.contact_update_failed', { component: 'discover', error: error.message });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_CONTACT_SAVE_FAILED, DISCOVER_CONTACT_SAVE_FAILED_MESSAGE));
      return;
    }
    if (!updated) {
      res
        .status(403)
        .json(
          apiErrorJson(API_ERROR_CODES.DISCOVER_CONTACT_NOT_ALLOWED, DISCOVER_CONTACT_NOT_ALLOWED_MESSAGE),
        );
      return;
    }

    res.json({ ok: true as const });
  } catch (err) {
    logger.error('discover.contact_exception', { component: 'discover', error: (err as Error).message });
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.DISCOVER_CONTACT_SAVE_FAILED, DISCOVER_CONTACT_SAVE_FAILED_MESSAGE));
  }
});

// ── POST /api/discover/:token/convert — consultant: audit shell + mapped brief ─

discoverRouter.post(
  '/:token/convert',
  requireAuth, attachProfile, requireRole('consultant'),
  async (req: AuthRequest, res) => {
    try {
      const token = singleRouteParam(req.params.token);
      if (!token || !DISCOVER_SESSION_TOKEN_PATTERN.test(token)) {
        res
          .status(400)
          .json(apiErrorJson(API_ERROR_CODES.DISCOVER_INVALID_TOKEN, DISCOVER_INVALID_TOKEN_MESSAGE));
        return;
      }

      const reviewPhases = reviewPhasesForMode('full');
      const { data: convertRows, error: convertErr } = await supabase.rpc(
        'discovery_convert_session_atomic',
        {
          p_session_token: token,
          p_consultant_id: req.userId!,
          p_company_url: NO_PUBLIC_WEBSITE_URL,
          p_product_mode: 'full',
          p_review_phases: reviewPhases,
          p_domain_keys: [...DOMAIN_KEYS],
          p_no_public_website: true,
        },
      );
      if (convertErr) {
        logger.error('discover.convert_rpc_failed', {
          component: 'discover',
          error: convertErr.message,
          code: (convertErr as { code?: string }).code,
          details: (convertErr as { details?: string }).details,
          hint: (convertErr as { hint?: string }).hint,
          session_token: token,
        });
        res
          .status(500)
          .json(apiErrorJson(API_ERROR_CODES.DISCOVER_CONVERT_FAILED, DISCOVER_CONVERT_FAILED_MESSAGE));
        return;
      }
      const convertRow = parseDiscoveryConvertRpcRow(convertRows);
      if (!convertRow) {
        logger.error('discover.convert_rpc_empty_shape', {
          component: 'discover',
          session_token: token,
        });
        res
          .status(500)
          .json(apiErrorJson(API_ERROR_CODES.DISCOVER_CONVERT_FAILED, DISCOVER_CONVERT_FAILED_MESSAGE));
        return;
      }
      if (convertRow.error_code === 'not_found') {
        res
          .status(404)
          .json(apiErrorJson(API_ERROR_CODES.DISCOVER_SESSION_NOT_FOUND, DISCOVER_SESSION_NOT_FOUND_MESSAGE));
        return;
      }
      if (convertRow.error_code === 'already_converted') {
        res.status(409).json({
          ...apiErrorJson(API_ERROR_CODES.DISCOVER_ALREADY_CONVERTED, DISCOVER_ALREADY_CONVERTED_MESSAGE),
          audit_id: convertRow.audit_id,
        });
        return;
      }
      if (convertRow.error_code === 'forbidden_owner') {
        res
          .status(403)
          .json(
            apiErrorJson(API_ERROR_CODES.DISCOVER_FORBIDDEN_OWNER, DISCOVER_FORBIDDEN_OWNER_MESSAGE),
          );
        return;
      }
      if (convertRow.error_code === 'claim_conflict') {
        res.status(409).json(
          apiErrorJson(API_ERROR_CODES.DISCOVER_CLAIM_CONFLICT, DISCOVER_CLAIM_CONFLICT_MESSAGE),
        );
        return;
      }
      if (convertRow.error_code === 'link_conflict') {
        res.status(409).json(apiErrorJson(API_ERROR_CODES.DISCOVER_LINK_CONFLICT, DISCOVER_LINK_CONFLICT_MESSAGE));
        return;
      }
      if (convertRow.error_code || !convertRow.audit_id) {
        res
          .status(500)
          .json(apiErrorJson(API_ERROR_CODES.DISCOVER_CONVERT_FAILED, DISCOVER_CONVERT_FAILED_MESSAGE));
        return;
      }
      const auditId = convertRow.audit_id;
      const answers = coerceDiscoverySessionAnswers(convertRow.answers);

      // Map discovery answers → intake brief
      let briefPatch: Record<string, BriefEntry> = {};
      try {
        briefPatch = discoveryToBriefPatch(answers);
      } catch (mapErr) {
        logger.warn('discover.convert_brief_map_failed', {
          component: 'discover',
          audit_id: auditId,
          error: (mapErr as Error).message,
        });
      }
      if (Object.keys(briefPatch).length > 0) {
        try {
          await saveBriefResponses(auditId, briefPatch, {
            // Continue as consultant-led intake (not public discovery); mapped cells stay source: client.
            collection_mode: 'interview',
            validation_perspective: 'consultant',
          });
        } catch (briefErr) {
          logger.warn('discover.convert_brief_skipped', {
            component: 'discover',
            error: (briefErr as Error).message,
          });
        }
      }

      logger.info('discover.converted', { component: 'discover', audit_id: auditId, session_token: token });
      res.status(201).json({ audit_id: auditId });
    } catch (err) {
      logger.error('discover.convert_exception', { component: 'discover', error: (err as Error).message });
      res
        .status(500)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_CONVERT_FAILED, DISCOVER_CONVERT_FAILED_MESSAGE));
    }
  },
);
