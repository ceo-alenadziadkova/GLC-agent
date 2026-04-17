import type { Request, Response } from 'express';

import {
  API_ERROR_CODES,
  DISCOVER_CONTACT_EDIT_KEY_INVALID_MESSAGE,
  DISCOVER_CONTACT_EMPTY_MESSAGE,
  DISCOVER_CONTACT_FIELDS_REQUIRED_MESSAGE,
  DISCOVER_CONTACT_NOT_ALLOWED_MESSAGE,
  DISCOVER_CONTACT_SAVE_FAILED_MESSAGE,
  DISCOVER_INVALID_TOKEN_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import {
  DISCOVER_CONTACT_EDIT_KEY_PATTERN,
  DISCOVER_SESSION_TOKEN_PATTERN,
} from '../../../config/discover-contract.js';
import { logger } from '../../../services/logger.js';
import { verifyContactEditKey } from '../services/discover-contact-edit-key.service.js';
import {
  getDiscoverySessionForContactPatch,
  updateDiscoverySessionContact,
} from '../services/discover-session.repository.js';
import {
  normalizeDiscoverRouteTokenParam,
  safeParsePatchDiscoverContactBody,
} from '../validators/discover-route-input.validator.js';

export async function patchDiscoverContactController(req: Request, res: Response) {
  try {
    const token = normalizeDiscoverRouteTokenParam(req.params.token);
    if (!token || !DISCOVER_SESSION_TOKEN_PATTERN.test(token)) {
      res.status(400).json(apiErrorJson(API_ERROR_CODES.DISCOVER_INVALID_TOKEN, DISCOVER_INVALID_TOKEN_MESSAGE));
      return;
    }

    const bodyParsed = safeParsePatchDiscoverContactBody(req.body);
    if (!bodyParsed.success) {
      res
        .status(400)
        .json(apiErrorJson(API_ERROR_CODES.DISCOVER_CONTACT_FIELDS_REQUIRED, DISCOVER_CONTACT_FIELDS_REQUIRED_MESSAGE));
      return;
    }
    const body = bodyParsed.data;

    const contactEditKeyRaw =
      typeof body.contact_edit_key === 'string' ? body.contact_edit_key.trim() : '';
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
    if (typeof body.contact_name === 'string') {
      patch.contact_name = body.contact_name.trim() || null;
    }
    if (typeof body.contact_email === 'string') {
      patch.contact_email = body.contact_email.trim() || null;
    }
    if (typeof body.contact_phone === 'string') {
      patch.contact_phone = body.contact_phone.trim() || null;
    }
    if (typeof body.contact_company === 'string') {
      patch.contact_company = body.contact_company.trim() || null;
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

    const { data: row, error: loadError } = await getDiscoverySessionForContactPatch(token);
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

    const { data: updated, error } = await updateDiscoverySessionContact(token, patch);

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
}
