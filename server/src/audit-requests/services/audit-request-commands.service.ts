import { ensureHttpsUrl } from '@glc/intake-core';
import { PublicUrlNotAllowedError, validatePublicAuditUrl } from '../../lib/public-http-url.js';
import { NO_PUBLIC_WEBSITE_URL, isNoPublicWebsiteUrl } from '../../config/no-public-website.js';
import { REQUEST_FIELD_LIMITS } from '../../config/request-field-limits.js';
import {
  API_ERROR_CODES,
  AUDIT_REQUEST_ACCESS_DENIED_MESSAGE,
  AUDIT_REQUEST_CREATE_FAILED_MESSAGE,
  AUDIT_REQUEST_DELIVER_WRONG_STATUS_MESSAGE,
  AUDIT_REQUEST_NOT_FOUND_MESSAGE,
  AUDIT_REQUEST_PRODUCT_MODE_INVALID_MESSAGE,
  AUDIT_REQUEST_REJECT_WRONG_STATUS_MESSAGE,
  AUDIT_REQUEST_SUBMIT_MISSING_SITE_MESSAGE,
  AUDIT_REQUEST_SUBMIT_NOT_DRAFT_MESSAGE,
  AUDIT_REQUEST_URL_OMIT_WHEN_NO_SITE_MESSAGE,
  AUDIT_REQUEST_URL_OR_FLAG_REQUIRED_MESSAGE,
  AUDIT_REQUEST_WRONG_STATUS_FOR_UPDATE_MESSAGE,
} from '../../config/api-error-codes.js';
import { emitStructuredNotification } from '../../services/notifications.js';
import {
  AUDIT_REQUEST_NOTIFICATION_DELIVERED_USER_MESSAGE,
  AUDIT_REQUEST_NOTIFICATION_DELIVERED_USER_TITLE,
  AUDIT_REQUEST_NOTIFICATION_REJECTED_USER_MESSAGE,
  AUDIT_REQUEST_NOTIFICATION_REJECTED_USER_TITLE,
} from '../../config/route-notification-messages.js';
import { buildPortalAuditRoute, ROUTE_NOTIFICATION_PATHS } from '../../config/route-notification-paths.js';
import { AuditRequestHttpError } from '../mappers/audit-request-error.mapper.js';
import { normalizeBriefSnapshotForIndustry } from '../domain/brief-snapshot-policy.js';
import { isAllowedAuditRequestProductMode } from '../domain/product-mode-policy.js';
import {
  isDeliverableAuditRequestStatus,
  isRejectableAuditRequestStatus,
  isUpdatableAuditRequestStatus,
} from '../domain/audit-request-status-policy.js';
import {
  createAuditRequestRow,
  getAuditRequestFieldsById,
  updateAuditRequestById,
  asAuditRequestRow,
} from '../repositories/audit-request.repository.js';

type ActorInput = { isConsultant: boolean; userId: string };

async function resolveNormalizedUrl(input: { url?: string; no_public_website?: boolean }) {
  const noSite = input.no_public_website === true;
  if (noSite) {
    if (input.url != null && typeof input.url === 'string' && input.url.trim() !== '') {
      throw new AuditRequestHttpError(
        400,
        API_ERROR_CODES.AUDIT_REQUEST_URL_OMIT_WHEN_NO_SITE,
        AUDIT_REQUEST_URL_OMIT_WHEN_NO_SITE_MESSAGE,
      );
    }
    return NO_PUBLIC_WEBSITE_URL;
  }

  if (!input.url || typeof input.url !== 'string' || !input.url.trim()) {
    throw new AuditRequestHttpError(
      400,
      API_ERROR_CODES.AUDIT_REQUEST_URL_OR_FLAG_REQUIRED,
      AUDIT_REQUEST_URL_OR_FLAG_REQUIRED_MESSAGE,
    );
  }

  const normalized = ensureHttpsUrl(input.url);
  try {
    return await validatePublicAuditUrl(normalized);
  } catch (error) {
    if (error instanceof PublicUrlNotAllowedError) {
      throw new AuditRequestHttpError(400, error.code, error.message);
    }
    throw error;
  }
}

async function getExistingOrThrow(id: string) {
  const { data, error } = await getAuditRequestFieldsById(id, 'id, status, client_id, industry, brief_snapshot, url, audit_id');
  if (error || !data) {
    throw new AuditRequestHttpError(404, API_ERROR_CODES.AUDIT_REQUEST_NOT_FOUND, AUDIT_REQUEST_NOT_FOUND_MESSAGE);
  }
  return asAuditRequestRow(data);
}

function assertOwnership(existingClientId: string, actor: ActorInput) {
  if (!actor.isConsultant && existingClientId !== actor.userId) {
    throw new AuditRequestHttpError(403, API_ERROR_CODES.AUDIT_REQUEST_ACCESS_DENIED, AUDIT_REQUEST_ACCESS_DENIED_MESSAGE);
  }
}

export async function createAuditRequestCommand(
  actor: ActorInput,
  body: {
    url?: string;
    industry?: string | null;
    product_mode: string;
    brief_snapshot: Record<string, unknown>;
    client_notes?: string;
    no_public_website?: boolean;
  },
) {
  if (!isAllowedAuditRequestProductMode(body.product_mode)) {
    throw new AuditRequestHttpError(
      400,
      API_ERROR_CODES.AUDIT_REQUEST_PRODUCT_MODE_INVALID,
      AUDIT_REQUEST_PRODUCT_MODE_INVALID_MESSAGE,
    );
  }

  const normalizedUrl = await resolveNormalizedUrl({ url: body.url, no_public_website: body.no_public_website });
  const snapshotResult = normalizeBriefSnapshotForIndustry(body.industry, body.brief_snapshot);
  if (!snapshotResult.ok) {
    throw new AuditRequestHttpError(400, API_ERROR_CODES.AUDIT_REQUEST_BRIEF_SNAPSHOT_INVALID, snapshotResult.error);
  }

  const { data, error } = await createAuditRequestRow({
    client_id: actor.userId,
    url: normalizedUrl,
    industry: body.industry || null,
    product_mode: body.product_mode,
    brief_snapshot: snapshotResult.snapshot,
    client_notes: body.client_notes ? String(body.client_notes).slice(0, REQUEST_FIELD_LIMITS.clientNotesMax) : null,
    status: 'draft',
  });
  if (error || !data) {
    throw new AuditRequestHttpError(500, API_ERROR_CODES.AUDIT_REQUEST_CREATE_FAILED, AUDIT_REQUEST_CREATE_FAILED_MESSAGE);
  }
  return data;
}

export async function updateAuditRequestCommand(
  actor: ActorInput,
  input: {
    id: string;
    url?: string;
    industry?: string | null;
    product_mode?: string;
    brief_snapshot?: Record<string, unknown>;
    client_notes?: string | null;
  },
) {
  const existing = await getExistingOrThrow(input.id);
  assertOwnership(existing.client_id, actor);

  if (!isUpdatableAuditRequestStatus(existing.status)) {
    throw new AuditRequestHttpError(
      400,
      API_ERROR_CODES.AUDIT_REQUEST_WRONG_STATUS_FOR_UPDATE,
      AUDIT_REQUEST_WRONG_STATUS_FOR_UPDATE_MESSAGE,
    );
  }

  const updates: Record<string, unknown> = {};
  if (input.url) {
    updates.url = await resolveNormalizedUrl({ url: input.url });
  }
  if (input.product_mode !== undefined) {
    if (!isAllowedAuditRequestProductMode(input.product_mode)) {
      throw new AuditRequestHttpError(
        400,
        API_ERROR_CODES.AUDIT_REQUEST_PRODUCT_MODE_INVALID,
        AUDIT_REQUEST_PRODUCT_MODE_INVALID_MESSAGE,
      );
    }
    updates.product_mode = input.product_mode;
  }
  if (input.industry !== undefined) {
    updates.industry = input.industry || null;
  }
  const nextIndustry = input.industry !== undefined ? input.industry : existing.industry;
  let nextSnapshot =
    existing.brief_snapshot && typeof existing.brief_snapshot === 'object' && !Array.isArray(existing.brief_snapshot)
      ? (existing.brief_snapshot as Record<string, unknown>)
      : {};
  if (input.brief_snapshot !== undefined) {
    nextSnapshot = { ...nextSnapshot, ...input.brief_snapshot };
  }
  if (input.industry !== undefined || input.brief_snapshot !== undefined) {
    const snapshotResult = normalizeBriefSnapshotForIndustry(nextIndustry, nextSnapshot);
    if (!snapshotResult.ok) {
      throw new AuditRequestHttpError(400, API_ERROR_CODES.AUDIT_REQUEST_BRIEF_SNAPSHOT_INVALID, snapshotResult.error);
    }
    updates.brief_snapshot = snapshotResult.snapshot;
  }
  if (input.client_notes !== undefined) {
    updates.client_notes = input.client_notes
      ? String(input.client_notes).slice(0, REQUEST_FIELD_LIMITS.clientNotesMax)
      : null;
  }

  const { data, error } = await updateAuditRequestById(input.id, updates);
  if (error || !data) {
    throw error ?? new Error('Failed to update audit request');
  }
  return { existingStatus: existing.status, data };
}

export async function submitAuditRequestCommand(actor: ActorInput, id: string) {
  const existing = await getExistingOrThrow(id);
  assertOwnership(existing.client_id, actor);
  if (existing.status !== 'draft') {
    throw new AuditRequestHttpError(
      400,
      API_ERROR_CODES.AUDIT_REQUEST_SUBMIT_NOT_DRAFT,
      AUDIT_REQUEST_SUBMIT_NOT_DRAFT_MESSAGE,
      { current_status: existing.status },
    );
  }

  const snapshotResult = normalizeBriefSnapshotForIndustry(
    existing.industry,
    (existing.brief_snapshot as Record<string, unknown>) ?? {},
  );
  if (!snapshotResult.ok) {
    throw new AuditRequestHttpError(400, API_ERROR_CODES.AUDIT_REQUEST_BRIEF_SNAPSHOT_INVALID, snapshotResult.error);
  }

  const url = String(existing.url ?? '').trim();
  if (!url || (!isNoPublicWebsiteUrl(url) && url.length < REQUEST_FIELD_LIMITS.auditCompanyUrlMinNormalizedLength)) {
    throw new AuditRequestHttpError(
      400,
      API_ERROR_CODES.AUDIT_REQUEST_SUBMIT_MISSING_SITE,
      AUDIT_REQUEST_SUBMIT_MISSING_SITE_MESSAGE,
    );
  }

  const { data, error } = await updateAuditRequestById(id, { status: 'submitted' });
  if (error || !data) {
    throw error ?? new Error('Failed to submit audit request');
  }
  return data;
}

export async function rejectAuditRequestCommand(id: string, consultantNote?: string) {
  const existing = await getExistingOrThrow(id);
  if (!isRejectableAuditRequestStatus(existing.status)) {
    throw new AuditRequestHttpError(
      400,
      API_ERROR_CODES.AUDIT_REQUEST_REJECT_WRONG_STATUS,
      AUDIT_REQUEST_REJECT_WRONG_STATUS_MESSAGE,
    );
  }
  const { data, error } = await updateAuditRequestById(id, {
    status: 'rejected',
    consultant_note: consultantNote ? String(consultantNote).slice(0, REQUEST_FIELD_LIMITS.consultantNoteMax) : null,
  });
  if (error || !data) throw error ?? new Error('Failed to reject audit request');

  await emitStructuredNotification({
    category: 'request',
    event: 'audit_request_rejected',
    priority: 'medium',
    audience: 'user',
    userId: data.client_id as string,
    title: AUDIT_REQUEST_NOTIFICATION_REJECTED_USER_TITLE,
    message: AUDIT_REQUEST_NOTIFICATION_REJECTED_USER_MESSAGE,
    route: ROUTE_NOTIFICATION_PATHS.portalHome,
    payload: {
      request_id: id,
      status: 'rejected',
      actor_role: 'consultant',
    },
  });

  return data;
}

export async function deliverAuditRequestCommand(id: string) {
  const existing = await getExistingOrThrow(id);
  if (!isDeliverableAuditRequestStatus(existing.status)) {
    throw new AuditRequestHttpError(
      400,
      API_ERROR_CODES.AUDIT_REQUEST_DELIVER_WRONG_STATUS,
      AUDIT_REQUEST_DELIVER_WRONG_STATUS_MESSAGE,
      { current_status: existing.status },
    );
  }
  const { data, error } = await updateAuditRequestById(id, { status: 'delivered' });
  if (error || !data) throw error ?? new Error('Failed to deliver audit request');

  await emitStructuredNotification({
    category: 'request',
    event: 'audit_request_delivered',
    priority: 'low',
    audience: 'user',
    userId: data.client_id as string,
    auditId: (data.audit_id as string | null) ?? null,
    title: AUDIT_REQUEST_NOTIFICATION_DELIVERED_USER_TITLE,
    message: AUDIT_REQUEST_NOTIFICATION_DELIVERED_USER_MESSAGE,
    route: data.audit_id ? buildPortalAuditRoute(data.audit_id as string) : ROUTE_NOTIFICATION_PATHS.portalHome,
    payload: {
      request_id: id,
      audit_id: data.audit_id,
      status: 'delivered',
      actor_role: 'consultant',
    },
  });
  return data;
}
