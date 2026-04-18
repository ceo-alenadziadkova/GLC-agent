/**
 * Audit Request routes — client self-serve request submission flow.
 *
 * POST   /api/audit-requests              — client submits request
 * GET    /api/audit-requests              — list requests (client: own; consultant: all)
 * GET    /api/audit-requests/:id          — get single request
 * PATCH  /api/audit-requests/:id          — client updates draft
 * POST   /api/audit-requests/:id/submit   — client finalises and submits
 * POST   /api/audit-requests/:id/approve  — consultant approves → creates audit
 * POST   /api/audit-requests/:id/reject   — consultant rejects with note
 * POST   /api/audit-requests/:id/deliver  — consultant marks as delivered
 */
import { Router } from 'express';
import { requireAuth, attachProfile, requireRole, type AuthRequest } from '../middleware/auth.js';
import { generalLimiter, createAuditLimiter } from '../middleware/rate-limit.js';
import {
  API_ERROR_CODES,
  AUDIT_REQUEST_GUEST_FORBIDDEN_MESSAGE,
  apiErrorJson,
} from '../config/api-error-codes.js';
import {
  approveAuditRequestHandler,
  createAuditRequestHandler,
  deliverAuditRequestHandler,
  getAuditRequestHandler,
  listAuditRequestsHandler,
  patchAuditRequestHandler,
  rejectAuditRequestHandler,
  submitAuditRequestHandler,
} from '../audit-requests/controllers/audit-requests.controller.js';

export const auditRequestsRouter = Router();

auditRequestsRouter.use(requireAuth);
auditRequestsRouter.use(attachProfile);
auditRequestsRouter.use((req: AuthRequest, res, next) => {
  if (req.userRole === 'guest') {
    res
      .status(403)
      .json(
        apiErrorJson(API_ERROR_CODES.AUDIT_REQUEST_GUEST_FORBIDDEN, AUDIT_REQUEST_GUEST_FORBIDDEN_MESSAGE),
      );
    return;
  }
  next();
});
auditRequestsRouter.use(generalLimiter);
auditRequestsRouter.post('/', createAuditLimiter, createAuditRequestHandler);
auditRequestsRouter.get('/', listAuditRequestsHandler);
auditRequestsRouter.get('/:id', getAuditRequestHandler);
auditRequestsRouter.patch('/:id', patchAuditRequestHandler);
auditRequestsRouter.post('/:id/submit', submitAuditRequestHandler);
auditRequestsRouter.post('/:id/approve', requireRole('consultant'), approveAuditRequestHandler);
auditRequestsRouter.post('/:id/reject', requireRole('consultant'), rejectAuditRequestHandler);
auditRequestsRouter.post('/:id/deliver', requireRole('consultant'), deliverAuditRequestHandler);
