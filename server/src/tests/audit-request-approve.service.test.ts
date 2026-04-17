import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuthRequest } from '../middleware/auth.js';
import { AuditRequestHttpError } from '../audit-requests/mappers/audit-request-error.mapper.js';

const getStoredIdempotentResponse = vi.fn();
const getAuditRequestById = vi.fn();
const claimAuditRequestForApprove = vi.fn();

vi.mock('../lib/idempotency.js', () => ({
  getStoredIdempotentResponse,
  storeIdempotentResponse: vi.fn(),
}));

vi.mock('../audit-requests/repositories/audit-request.repository.js', () => ({
  getAuditRequestById,
  claimAuditRequestForApprove,
  deleteAuditById: vi.fn(),
  updateAuditRequestById: vi.fn(),
}));

vi.mock('../services/execution-plan.js', () => ({
  defaultExecutionPlanForPackage: vi.fn(() => ({ phases: [] })),
}));

vi.mock('../lib/audit-coverage-bridge.js', () => ({
  coveragePackageFromAuditRequestProductMode: vi.fn(() => 'express'),
  persistedProductModeForExecutionPlan: vi.fn(() => 'express'),
}));

vi.mock('../services/audit-initialization.js', () => ({
  createAuditWithChildren: vi.fn(),
}));

vi.mock('../services/brief-validator.js', () => ({
  saveBriefResponses: vi.fn(),
}));

vi.mock('../services/notifications.js', () => ({
  emitStructuredNotification: vi.fn(),
}));

describe('approveAuditRequestCommand', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns replay payload when idempotency replay exists', async () => {
    const replay = { statusCode: 201, payload: { ok: true } };
    getStoredIdempotentResponse.mockResolvedValue({ replay });
    const { approveAuditRequestCommand } = await import('../audit-requests/services/audit-request-approve.service.js');

    const result = await approveAuditRequestCommand({ body: {}, userId: 'u1' } as AuthRequest, 'req-1');
    expect(result).toEqual({ replay });
    expect(getAuditRequestById).not.toHaveBeenCalled();
  });

  it('throws claim conflict when submitted row was not claimed', async () => {
    getStoredIdempotentResponse.mockResolvedValue({ replay: null, key: 'k', hash: 'h' });
    getAuditRequestById.mockResolvedValue({
      data: { id: 'req-1', status: 'submitted', product_mode: 'express', client_id: 'c1', url: 'https://a.test' },
      error: null,
    });
    claimAuditRequestForApprove.mockResolvedValue({ data: [], error: null });
    const { approveAuditRequestCommand } = await import('../audit-requests/services/audit-request-approve.service.js');

    await expect(approveAuditRequestCommand({ body: {}, userId: 'u1' } as AuthRequest, 'req-1')).rejects.toBeInstanceOf(
      AuditRequestHttpError,
    );
  });

  it('throws in-progress conflict when row is already under_review', async () => {
    getStoredIdempotentResponse.mockResolvedValue({ replay: null, key: 'k', hash: 'h' });
    getAuditRequestById.mockResolvedValue({
      data: { id: 'req-1', status: 'under_review', product_mode: 'express', client_id: 'c1', url: 'https://a.test' },
      error: null,
    });
    claimAuditRequestForApprove.mockResolvedValue({ data: [], error: null });
    const { approveAuditRequestCommand } = await import('../audit-requests/services/audit-request-approve.service.js');

    await expect(approveAuditRequestCommand({ body: {}, userId: 'u1' } as AuthRequest, 'req-1')).rejects.toBeInstanceOf(
      AuditRequestHttpError,
    );
  });
});
