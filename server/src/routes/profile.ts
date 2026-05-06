import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, attachProfile, type AuthRequest } from '../middleware/auth.js';
import { updateContext } from '../services/observability-context.js';
import { supabase } from '../services/supabase.js';
import {
  API_ERROR_CODES,
  PROFILE_LOAD_FAILED_MESSAGE,
  PROFILE_LEGAL_CONSENTS_LOAD_FAILED_MESSAGE,
  PROFILE_LEGAL_CONSENTS_PAYLOAD_INVALID_MESSAGE,
  PROFILE_LEGAL_CONSENTS_SAVE_FAILED_MESSAGE,
  PROFILE_PAYLOAD_INVALID_MESSAGE,
  PROFILE_UPDATE_FAILED_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';
import { canManagePlatformSettings } from '../lib/platform-admin.js';
import { LEGAL_CONSENT_KEYS, LEGAL_CONSENT_SOURCES, type LegalConsentKey } from '../types/legal-consent.js';
import {
  appendLegalConsentEvents,
  getEffectiveLegalConsentsForUser,
} from '../services/legal-consent.service.js';

const patchProfileSchema = z.object({
  full_name: z.string().trim().max(200).nullable().optional(),
});

const consentKeySchema = z.enum(LEGAL_CONSENT_KEYS);

const postLegalConsentsSchema = z.object({
  source: z.enum(LEGAL_CONSENT_SOURCES).default('api'),
  events: z
    .array(
      z.object({
        consent_key: consentKeySchema,
        accepted: z.boolean(),
      }),
    )
    .min(1)
    .max(20),
});

export const profileRouter = Router();

profileRouter.get('/', requireAuth, attachProfile, async (req: AuthRequest, res) => {
  updateContext({ userId: req.userId ?? undefined });

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', req.userId)
    .single();

  if (error) {
    res.status(500).json(apiErrorJson(API_ERROR_CODES.PROFILE_LOAD_FAILED, PROFILE_LOAD_FAILED_MESSAGE));
    return;
  }

  const canManagePlatform =
    req.userRole === 'consultant' ? await canManagePlatformSettings(req.userId!) : false;

  res.json({
    id: req.userId,
    role: req.userRole,
    email: req.userEmail,
    full_name: profile?.full_name ?? null,
    can_manage_platform_settings: canManagePlatform,
  });
});

profileRouter.patch('/', requireAuth, attachProfile, async (req: AuthRequest, res) => {
  updateContext({ userId: req.userId ?? undefined });

  const parsed = patchProfileSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res.status(400).json(apiErrorJson(API_ERROR_CODES.PROFILE_PAYLOAD_INVALID, PROFILE_PAYLOAD_INVALID_MESSAGE));
    return;
  }

  const normalizedFullName = (() => {
    if (parsed.data.full_name === undefined || parsed.data.full_name === null) {
      return null;
    }
    const trimmed = parsed.data.full_name.trim();
    return trimmed.length > 0 ? trimmed : null;
  })();

  const { error } = await supabase
    .from('profiles')
    .update({ full_name: normalizedFullName })
    .eq('id', req.userId);

  if (error) {
    res.status(500).json(apiErrorJson(API_ERROR_CODES.PROFILE_UPDATE_FAILED, PROFILE_UPDATE_FAILED_MESSAGE));
    return;
  }

  const canManagePlatform =
    req.userRole === 'consultant' ? await canManagePlatformSettings(req.userId!) : false;

  res.json({
    id: req.userId,
    role: req.userRole,
    email: req.userEmail,
    full_name: normalizedFullName,
    can_manage_platform_settings: canManagePlatform,
  });
});

profileRouter.get('/legal-consents', requireAuth, attachProfile, async (req: AuthRequest, res) => {
  updateContext({ userId: req.userId ?? undefined });
  try {
    const body = await getEffectiveLegalConsentsForUser(req.userId!);
    res.json(body);
  } catch {
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.PROFILE_LEGAL_CONSENTS_LOAD_FAILED, PROFILE_LEGAL_CONSENTS_LOAD_FAILED_MESSAGE));
  }
});

profileRouter.post('/legal-consents', requireAuth, attachProfile, async (req: AuthRequest, res) => {
  updateContext({ userId: req.userId ?? undefined });

  const parsed = postLegalConsentsSchema.safeParse(req.body ?? {});
  if (!parsed.success) {
    res
      .status(400)
      .json(apiErrorJson(API_ERROR_CODES.PROFILE_LEGAL_CONSENTS_PAYLOAD_INVALID, PROFILE_LEGAL_CONSENTS_PAYLOAD_INVALID_MESSAGE));
    return;
  }

  const keys = new Set<LegalConsentKey>();
  for (const ev of parsed.data.events) {
    if (keys.has(ev.consent_key)) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.PROFILE_LEGAL_CONSENTS_PAYLOAD_INVALID, PROFILE_LEGAL_CONSENTS_PAYLOAD_INVALID_MESSAGE));
      return;
    }
    keys.add(ev.consent_key);
  }

  try {
    await appendLegalConsentEvents(req.userId!, parsed.data.events, parsed.data.source);
    const body = await getEffectiveLegalConsentsForUser(req.userId!);
    res.status(201).json(body);
  } catch {
    res
      .status(500)
      .json(apiErrorJson(API_ERROR_CODES.PROFILE_LEGAL_CONSENTS_SAVE_FAILED, PROFILE_LEGAL_CONSENTS_SAVE_FAILED_MESSAGE));
  }
});
