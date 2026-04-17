import type { Response } from 'express';
import { ZodError } from 'zod';
import type { AuthRequest } from '../../middleware/auth.js';
import {
  API_ERROR_CODES,
  type ApiErrorCode,
  AUDIT_REQUEST_APPROVE_FAILED_MESSAGE,
  AUDIT_REQUEST_CREATE_FAILED_MESSAGE,
  AUDIT_REQUEST_DELIVER_FAILED_MESSAGE,
  AUDIT_REQUEST_FETCH_FAILED_MESSAGE,
  AUDIT_REQUEST_LIST_FAILED_MESSAGE,
  AUDIT_REQUEST_REJECT_FAILED_MESSAGE,
  AUDIT_REQUEST_SUBMIT_FAILED_MESSAGE,
  AUDIT_REQUEST_UPDATE_FAILED_MESSAGE,
  IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE,
  apiErrorJson,
} from '../../config/api-error-codes.js';
import { logger } from '../../services/logger.js';
import { isIdempotencyPayloadConflictError } from '../../lib/idempotency.js';
import { AuditRequestHttpError } from '../mappers/audit-request-error.mapper.js';
import {
  auditRequestApproveBodySchema,
  auditRequestCreateBodySchema,
  auditRequestIdParamsSchema,
  auditRequestListQuerySchema,
  auditRequestPatchBodySchema,
  auditRequestRejectBodySchema,
} from '../validators/audit-request-input.validator.js';
import { listAuditRequestsForActor, getAuditRequestForActor } from '../services/audit-request-query.service.js';
import {
  createAuditRequestCommand,
  deliverAuditRequestCommand,
  rejectAuditRequestCommand,
  submitAuditRequestCommand,
  updateAuditRequestCommand,
} from '../services/audit-request-commands.service.js';
import { approveAuditRequestCommand } from '../services/audit-request-approve.service.js';

function isConsultant(req: AuthRequest) {
  return req.userRole === 'consultant';
}

function writeAuditRequestError(res: Response, err: unknown, fallbackCode: ApiErrorCode, fallbackMessage: string) {
  if (err instanceof AuditRequestHttpError) {
    res.status(err.statusCode).json({
      ...apiErrorJson(err.code, err.message),
      ...(err.details ?? {}),
    });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json(apiErrorJson(fallbackCode, err.issues[0]?.message ?? fallbackMessage));
    return;
  }
  res.status(500).json(apiErrorJson(fallbackCode, fallbackMessage));
}

export async function createAuditRequestHandler(req: AuthRequest, res: Response) {
  try {
    const body = auditRequestCreateBodySchema.parse(req.body);
    const data = await createAuditRequestCommand(
      { isConsultant: isConsultant(req), userId: req.userId! },
      body,
    );
    res.status(201).json(data);
  } catch (err) {
    logger.error('route.audit_request_create_failed', { component: 'audit_requests', error: (err as Error).message });
    writeAuditRequestError(res, err, API_ERROR_CODES.AUDIT_REQUEST_CREATE_FAILED, AUDIT_REQUEST_CREATE_FAILED_MESSAGE);
  }
}

export async function listAuditRequestsHandler(req: AuthRequest, res: Response) {
  try {
    const query = auditRequestListQuerySchema.parse(req.query);
    const result = await listAuditRequestsForActor({
      isConsultant: isConsultant(req),
      userId: req.userId!,
      limit: query.limit,
      offset: query.offset,
    });
    res.json(result);
  } catch (err) {
    logger.error('route.audit_requests_list_failed', { component: 'audit_requests', error: (err as Error).message });
    writeAuditRequestError(res, err, API_ERROR_CODES.AUDIT_REQUEST_LIST_FAILED, AUDIT_REQUEST_LIST_FAILED_MESSAGE);
  }
}

export async function getAuditRequestHandler(req: AuthRequest, res: Response) {
  try {
    const params = auditRequestIdParamsSchema.parse(req.params);
    const data = await getAuditRequestForActor({ id: params.id, isConsultant: isConsultant(req), userId: req.userId! });
    res.json(data);
  } catch (err) {
    logger.error('route.audit_request_get_failed', { component: 'audit_requests', error: (err as Error).message });
    writeAuditRequestError(res, err, API_ERROR_CODES.AUDIT_REQUEST_FETCH_FAILED, AUDIT_REQUEST_FETCH_FAILED_MESSAGE);
  }
}

export async function patchAuditRequestHandler(req: AuthRequest, res: Response) {
  try {
    const params = auditRequestIdParamsSchema.parse(req.params);
    const body = auditRequestPatchBodySchema.parse(req.body);
    const result = await updateAuditRequestCommand({ isConsultant: isConsultant(req), userId: req.userId! }, { id: params.id, ...body });
    res.json(result.data);
  } catch (err) {
    logger.error('route.audit_request_patch_failed', { component: 'audit_requests', error: (err as Error).message });
    writeAuditRequestError(res, err, API_ERROR_CODES.AUDIT_REQUEST_UPDATE_FAILED, AUDIT_REQUEST_UPDATE_FAILED_MESSAGE);
  }
}

export async function submitAuditRequestHandler(req: AuthRequest, res: Response) {
  try {
    const params = auditRequestIdParamsSchema.parse(req.params);
    const data = await submitAuditRequestCommand({ isConsultant: isConsultant(req), userId: req.userId! }, params.id);
    res.json(data);
  } catch (err) {
    logger.error('route.audit_request_submit_failed', { component: 'audit_requests', error: (err as Error).message });
    writeAuditRequestError(res, err, API_ERROR_CODES.AUDIT_REQUEST_SUBMIT_FAILED, AUDIT_REQUEST_SUBMIT_FAILED_MESSAGE);
  }
}

export async function approveAuditRequestHandler(req: AuthRequest, res: Response) {
  try {
    const params = auditRequestIdParamsSchema.parse(req.params);
    const body = auditRequestApproveBodySchema.parse(req.body);
    const result = await approveAuditRequestCommand(req, params.id, body.consultant_note);
    if (result.replay) {
      res.status(result.replay.statusCode).json(result.replay.payload);
      return;
    }
    res.status(201).json(result.payload);
  } catch (err) {
    if (isIdempotencyPayloadConflictError(err)) {
      res
        .status(409)
        .json(apiErrorJson(API_ERROR_CODES.IDEMPOTENCY_PAYLOAD_MISMATCH, IDEMPOTENCY_PAYLOAD_MISMATCH_MESSAGE));
      return;
    }
    logger.error('route.audit_request_approve_failed', { component: 'audit_requests', error: (err as Error).message });
    writeAuditRequestError(res, err, API_ERROR_CODES.AUDIT_REQUEST_APPROVE_FAILED, AUDIT_REQUEST_APPROVE_FAILED_MESSAGE);
  }
}

export async function rejectAuditRequestHandler(req: AuthRequest, res: Response) {
  try {
    const params = auditRequestIdParamsSchema.parse(req.params);
    const body = auditRequestRejectBodySchema.parse(req.body);
    const data = await rejectAuditRequestCommand(params.id, body.consultant_note);
    res.json(data);
  } catch (err) {
    logger.error('route.audit_request_reject_failed', { component: 'audit_requests', error: (err as Error).message });
    writeAuditRequestError(res, err, API_ERROR_CODES.AUDIT_REQUEST_REJECT_FAILED, AUDIT_REQUEST_REJECT_FAILED_MESSAGE);
  }
}

export async function deliverAuditRequestHandler(req: AuthRequest, res: Response) {
  try {
    const params = auditRequestIdParamsSchema.parse(req.params);
    const data = await deliverAuditRequestCommand(params.id);
    res.json(data);
  } catch (err) {
    logger.error('route.audit_request_deliver_failed', { component: 'audit_requests', error: (err as Error).message });
    writeAuditRequestError(res, err, API_ERROR_CODES.AUDIT_REQUEST_DELIVER_FAILED, AUDIT_REQUEST_DELIVER_FAILED_MESSAGE);
  }
}
