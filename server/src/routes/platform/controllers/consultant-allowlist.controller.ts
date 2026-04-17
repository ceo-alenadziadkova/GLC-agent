import type { Response } from 'express';
import type { AuthRequest } from '../../../middleware/auth.js';
import { canActorManagePlatformSettings } from '../../../services/platform/platform-admin-access.service.js';
import {
  addConsultantAllowlistEmail,
  listConsultantAllowlistEmails,
  normalizeConsultantAllowlistEmail,
  removeConsultantAllowlistEmail,
} from '../../../services/platform/platform-allowlist.service.js';
import {
  API_ERROR_CODES,
  PLATFORM_CONSULTANT_ALLOWLIST_ADD_FAILED_MESSAGE,
  PLATFORM_CONSULTANT_ALLOWLIST_DUPLICATE_MESSAGE,
  PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID_MESSAGE,
  PLATFORM_CONSULTANT_ALLOWLIST_LOAD_FAILED_MESSAGE,
  PLATFORM_CONSULTANT_ALLOWLIST_REMOVE_FAILED_MESSAGE,
  apiErrorJson,
} from '../../../config/api-error-codes.js';
import { consultantAllowlistAddBodySchema, consultantAllowlistDeleteQuerySchema } from '../validators/platform.schemas.js';
import { writePlatformAdminOnly } from '../http/platform-errors.js';

export async function getConsultantAllowlistHandler(req: AuthRequest, res: Response) {
  try {
    const uid = req.userId!;
    if (!(await canActorManagePlatformSettings(uid))) {
      writePlatformAdminOnly(res);
      return;
    }
    const listed = await listConsultantAllowlistEmails();
    if (!listed.ok) {
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_LOAD_FAILED,
            PLATFORM_CONSULTANT_ALLOWLIST_LOAD_FAILED_MESSAGE,
          ),
        );
      return;
    }
    res.json({ emails: listed.emails });
  } catch {
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_LOAD_FAILED,
          PLATFORM_CONSULTANT_ALLOWLIST_LOAD_FAILED_MESSAGE,
        ),
      );
  }
}

export async function addConsultantAllowlistHandler(req: AuthRequest, res: Response) {
  try {
    const uid = req.userId!;
    if (!(await canActorManagePlatformSettings(uid))) {
      writePlatformAdminOnly(res);
      return;
    }
    const parsed = consultantAllowlistAddBodySchema.safeParse(req.body);
    if (!parsed.success) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID,
            PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID_MESSAGE,
          ),
        );
      return;
    }
    const normalized = normalizeConsultantAllowlistEmail(parsed.data.email);
    if (!normalized) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID,
            PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID_MESSAGE,
          ),
        );
      return;
    }
    const added = await addConsultantAllowlistEmail(normalized);
    if (!added.ok) {
      if ('conflict' in added && added.conflict) {
        res.status(409).json(
          apiErrorJson(API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_DUPLICATE, PLATFORM_CONSULTANT_ALLOWLIST_DUPLICATE_MESSAGE, {
            details: { conflict: true },
          }),
        );
        return;
      }
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_ADD_FAILED,
            PLATFORM_CONSULTANT_ALLOWLIST_ADD_FAILED_MESSAGE,
          ),
        );
      return;
    }
    res.status(201).json({ ok: true, email: normalized });
  } catch {
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_ADD_FAILED,
          PLATFORM_CONSULTANT_ALLOWLIST_ADD_FAILED_MESSAGE,
        ),
      );
  }
}

export async function removeConsultantAllowlistHandler(req: AuthRequest, res: Response) {
  try {
    const uid = req.userId!;
    if (!(await canActorManagePlatformSettings(uid))) {
      writePlatformAdminOnly(res);
      return;
    }
    const parsedQuery = consultantAllowlistDeleteQuerySchema.safeParse(req.query);
    const normalized = normalizeConsultantAllowlistEmail(parsedQuery.success ? parsedQuery.data.email ?? '' : '');
    if (!normalized) {
      res
        .status(400)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID,
            PLATFORM_CONSULTANT_ALLOWLIST_EMAIL_INVALID_MESSAGE,
          ),
        );
      return;
    }
    const removed = await removeConsultantAllowlistEmail(normalized);
    if (!removed.ok) {
      res
        .status(500)
        .json(
          apiErrorJson(
            API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_REMOVE_FAILED,
            PLATFORM_CONSULTANT_ALLOWLIST_REMOVE_FAILED_MESSAGE,
          ),
        );
      return;
    }
    res.json({ ok: true, removed: removed.removed, email: normalized });
  } catch {
    res
      .status(500)
      .json(
        apiErrorJson(
          API_ERROR_CODES.PLATFORM_CONSULTANT_ALLOWLIST_REMOVE_FAILED,
          PLATFORM_CONSULTANT_ALLOWLIST_REMOVE_FAILED_MESSAGE,
        ),
      );
  }
}
