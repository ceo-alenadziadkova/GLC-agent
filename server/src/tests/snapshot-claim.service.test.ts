/**
 * Behaviour: docs/AUTH.md — attaching a public free_snapshot audit via snapshot_token / POST /api/snapshot/claim.
 * Unit coverage for domain orchestration in snapshot-claim.service (HTTP route tests live in snapshot-route-claim-compare.test.ts).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

const findFreeSnapshotAuditByToken = vi.fn();
const claimAuditByIdIfUnclaimed = vi.fn();
const readAuditClientById = vi.fn();
const updateGuestSessionClaimed = vi.fn();
const emitStructuredNotification = vi.fn();

vi.mock('../snapshot/repositories/snapshot-route.repository.js', () => ({
  findFreeSnapshotAuditByToken,
  claimAuditByIdIfUnclaimed,
  readAuditClientById,
  updateGuestSessionClaimed,
}));

vi.mock('../services/notifications.js', () => ({
  emitStructuredNotification,
}));

const CLAIM_TOKEN = '550e8400-e29b-41d4-a716-446655440000';
const USER_ID = 'test-snapshot-user-id';
const AUDIT_ID = 'audit-claim-unit';
const RECENT_CREATED = '2026-04-15T12:00:00.000Z';

describe('claimSnapshotForUser', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns not_found when repository returns an error', async () => {
    findFreeSnapshotAuditByToken.mockResolvedValue({ data: null, error: { message: 'db' } });
    const { claimSnapshotForUser } = await import('../snapshot/services/snapshot-claim.service.js');
    await expect(claimSnapshotForUser(CLAIM_TOKEN, USER_ID)).resolves.toEqual({ type: 'not_found' });
    expect(updateGuestSessionClaimed).not.toHaveBeenCalled();
    expect(emitStructuredNotification).not.toHaveBeenCalled();
  });

  it('returns not_found when audit row is missing', async () => {
    findFreeSnapshotAuditByToken.mockResolvedValue({ data: null, error: null });
    const { claimSnapshotForUser } = await import('../snapshot/services/snapshot-claim.service.js');
    await expect(claimSnapshotForUser(CLAIM_TOKEN, USER_ID)).resolves.toEqual({ type: 'not_found' });
  });

  it('returns expired when token TTL exceeded', async () => {
    findFreeSnapshotAuditByToken.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        client_id: null,
        snapshot_token: CLAIM_TOKEN,
        created_at: '2000-01-01T00:00:00.000Z',
      },
      error: null,
    });
    const { claimSnapshotForUser } = await import('../snapshot/services/snapshot-claim.service.js');
    await expect(claimSnapshotForUser(CLAIM_TOKEN, USER_ID)).resolves.toEqual({ type: 'expired' });
    expect(claimAuditByIdIfUnclaimed).not.toHaveBeenCalled();
  });

  it('returns conflict when audit is linked to another user', async () => {
    findFreeSnapshotAuditByToken.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        client_id: 'someone-else',
        snapshot_token: CLAIM_TOKEN,
        created_at: RECENT_CREATED,
      },
      error: null,
    });
    const { claimSnapshotForUser } = await import('../snapshot/services/snapshot-claim.service.js');
    await expect(claimSnapshotForUser(CLAIM_TOKEN, USER_ID)).resolves.toEqual({ type: 'conflict' });
    expect(claimAuditByIdIfUnclaimed).not.toHaveBeenCalled();
  });

  it('returns ok with alreadyClaimed when client_id already matches user', async () => {
    findFreeSnapshotAuditByToken.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        client_id: USER_ID,
        snapshot_token: CLAIM_TOKEN,
        created_at: RECENT_CREATED,
      },
      error: null,
    });
    const { claimSnapshotForUser } = await import('../snapshot/services/snapshot-claim.service.js');
    await expect(claimSnapshotForUser(CLAIM_TOKEN, USER_ID)).resolves.toEqual({
      type: 'ok',
      auditId: AUDIT_ID,
      alreadyClaimed: true,
    });
    expect(updateGuestSessionClaimed).toHaveBeenCalledWith(CLAIM_TOKEN, USER_ID);
    expect(emitStructuredNotification).not.toHaveBeenCalled();
  });

  it('claims unclaimed audit, notifies, and returns ok with alreadyClaimed false', async () => {
    findFreeSnapshotAuditByToken.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        client_id: null,
        snapshot_token: CLAIM_TOKEN,
        created_at: RECENT_CREATED,
      },
      error: null,
    });
    claimAuditByIdIfUnclaimed.mockResolvedValue({
      data: { id: AUDIT_ID, client_id: USER_ID },
      error: null,
    });
    const { claimSnapshotForUser } = await import('../snapshot/services/snapshot-claim.service.js');
    await expect(claimSnapshotForUser(CLAIM_TOKEN, USER_ID)).resolves.toEqual({
      type: 'ok',
      auditId: AUDIT_ID,
      alreadyClaimed: false,
    });
    expect(updateGuestSessionClaimed).toHaveBeenCalledWith(CLAIM_TOKEN, USER_ID);
    expect(emitStructuredNotification).toHaveBeenCalledTimes(1);
    expect(emitStructuredNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        category: 'snapshot',
        event: 'snapshot_claimed',
        auditId: AUDIT_ID,
      }),
    );
  });

  it('returns ok with alreadyClaimed true when claim update races but row shows same user', async () => {
    findFreeSnapshotAuditByToken.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        client_id: null,
        snapshot_token: CLAIM_TOKEN,
        created_at: RECENT_CREATED,
      },
      error: null,
    });
    claimAuditByIdIfUnclaimed.mockResolvedValue({ data: null, error: { message: 'conflict' } });
    readAuditClientById.mockResolvedValue({
      data: { id: AUDIT_ID, client_id: USER_ID },
      error: null,
    });
    const { claimSnapshotForUser } = await import('../snapshot/services/snapshot-claim.service.js');
    await expect(claimSnapshotForUser(CLAIM_TOKEN, USER_ID)).resolves.toEqual({
      type: 'ok',
      auditId: AUDIT_ID,
      alreadyClaimed: true,
    });
    // Race recovery path returns early without guest-session update (same as HTTP handler semantics).
    expect(updateGuestSessionClaimed).not.toHaveBeenCalled();
    expect(emitStructuredNotification).not.toHaveBeenCalled();
  });

  it('returns conflict when claim fails and row is not owned by user', async () => {
    findFreeSnapshotAuditByToken.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        client_id: null,
        snapshot_token: CLAIM_TOKEN,
        created_at: RECENT_CREATED,
      },
      error: null,
    });
    claimAuditByIdIfUnclaimed.mockResolvedValue({ data: null, error: { message: 'conflict' } });
    readAuditClientById.mockResolvedValue({
      data: { id: AUDIT_ID, client_id: 'other' },
      error: null,
    });
    const { claimSnapshotForUser } = await import('../snapshot/services/snapshot-claim.service.js');
    await expect(claimSnapshotForUser(CLAIM_TOKEN, USER_ID)).resolves.toEqual({ type: 'conflict' });
    expect(emitStructuredNotification).not.toHaveBeenCalled();
  });

  it('returns conflict when claim fails and follow-up read has no row', async () => {
    findFreeSnapshotAuditByToken.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        client_id: null,
        snapshot_token: CLAIM_TOKEN,
        created_at: RECENT_CREATED,
      },
      error: null,
    });
    claimAuditByIdIfUnclaimed.mockResolvedValue({ data: null, error: { message: 'noop' } });
    readAuditClientById.mockResolvedValue({ data: null, error: null });
    const { claimSnapshotForUser } = await import('../snapshot/services/snapshot-claim.service.js');
    await expect(claimSnapshotForUser(CLAIM_TOKEN, USER_ID)).resolves.toEqual({ type: 'conflict' });
  });

  it('returns conflict when claim returns no row without error but read does not confirm user', async () => {
    findFreeSnapshotAuditByToken.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        client_id: null,
        snapshot_token: CLAIM_TOKEN,
        created_at: RECENT_CREATED,
      },
      error: null,
    });
    claimAuditByIdIfUnclaimed.mockResolvedValue({ data: null, error: null });
    readAuditClientById.mockResolvedValue({
      data: { id: AUDIT_ID, client_id: null },
      error: null,
    });
    const { claimSnapshotForUser } = await import('../snapshot/services/snapshot-claim.service.js');
    await expect(claimSnapshotForUser(CLAIM_TOKEN, USER_ID)).resolves.toEqual({ type: 'conflict' });
  });
});
