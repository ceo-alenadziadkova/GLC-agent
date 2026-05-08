import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseMocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  insert: vi.fn(),
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    rpc: supabaseMocks.rpc,
    from: supabaseMocks.from,
  },
}));

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { applyAuditTokenBudgetTopup } from '../services/audits/audit-token-budget-topup.service.js';

function setupSupabase(): void {
  supabaseMocks.insert.mockResolvedValue({ error: null });
  supabaseMocks.from.mockImplementation(() => ({ insert: supabaseMocks.insert }));
}

describe('applyAuditTokenBudgetTopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupSupabase();
  });

  it('rejects invalid audit id', async () => {
    const result = await applyAuditTokenBudgetTopup({
      auditId: '',
      grantedByUserId: 'user-1',
      deltaTokens: 50_000,
    });

    expect(result).toEqual({ ok: false, reason: 'audit_id_invalid' });
    expect(supabaseMocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects non-integer delta', async () => {
    const result = await applyAuditTokenBudgetTopup({
      auditId: 'audit-1',
      grantedByUserId: 'user-1',
      deltaTokens: 1234.5,
    });

    expect(result).toEqual({ ok: false, reason: 'delta_invalid' });
    expect(supabaseMocks.rpc).not.toHaveBeenCalled();
  });

  it('rejects delta below min', async () => {
    const result = await applyAuditTokenBudgetTopup({
      auditId: 'audit-1',
      grantedByUserId: 'user-1',
      deltaTokens: 100,
    });

    expect(result).toEqual({ ok: false, reason: 'delta_invalid' });
  });

  it('rejects delta above max', async () => {
    const result = await applyAuditTokenBudgetTopup({
      auditId: 'audit-1',
      grantedByUserId: 'user-1',
      deltaTokens: 99_999_999,
    });

    expect(result).toEqual({ ok: false, reason: 'delta_invalid' });
  });

  it('rejects reason longer than max length', async () => {
    const longReason = 'x'.repeat(2_000);
    const result = await applyAuditTokenBudgetTopup({
      auditId: 'audit-1',
      grantedByUserId: 'user-1',
      deltaTokens: 50_000,
      reason: longReason,
    });

    expect(result).toEqual({ ok: false, reason: 'reason_too_long' });
  });

  it('returns audit_not_found when RPC reports audit_not_found', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'audit_not_found' },
    });

    const result = await applyAuditTokenBudgetTopup({
      auditId: 'audit-1',
      grantedByUserId: 'user-1',
      deltaTokens: 50_000,
    });

    expect(result).toEqual({ ok: false, reason: 'audit_not_found' });
  });

  it('returns rpc_failed on generic RPC error', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { message: 'connection error' },
    });

    const result = await applyAuditTokenBudgetTopup({
      auditId: 'audit-1',
      grantedByUserId: 'user-1',
      deltaTokens: 50_000,
    });

    expect(result).toEqual({ ok: false, reason: 'rpc_failed' });
  });

  it('returns ok and emits pipeline_events row on success', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({
      data: [
        {
          grant_id: 'grant-1',
          previous_budget: 200_000,
          new_budget: 250_000,
          tokens_used: 199_000,
        },
      ],
      error: null,
    });

    const result = await applyAuditTokenBudgetTopup({
      auditId: 'audit-1',
      grantedByUserId: 'user-1',
      deltaTokens: 50_000,
      reason: '  extra context  ',
    });

    expect(result).toEqual({
      ok: true,
      grant_id: 'grant-1',
      previous_budget: 200_000,
      token_budget: 250_000,
      tokens_used: 199_000,
      tokens_remaining: 51_000,
    });

    expect(supabaseMocks.rpc).toHaveBeenCalledWith('apply_audit_token_budget_topup', {
      p_audit_id: 'audit-1',
      p_granted_by: 'user-1',
      p_delta: 50_000,
      p_reason: 'extra context',
    });

    expect(supabaseMocks.from).toHaveBeenCalledWith('pipeline_events');
    expect(supabaseMocks.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        audit_id: 'audit-1',
        event_type: 'token_budget_topup',
        data: expect.objectContaining({
          actor_user_id: 'user-1',
          delta_tokens: 50_000,
          previous_budget: 200_000,
          new_budget: 250_000,
          tokens_used: 199_000,
          reason: 'extra context',
          grant_id: 'grant-1',
        }),
      }),
    );
  });

  it('clamps tokens_remaining to non-negative when usage exceeds budget', async () => {
    supabaseMocks.rpc.mockResolvedValueOnce({
      data: {
        grant_id: 'grant-2',
        previous_budget: 200_000,
        new_budget: 200_000,
        tokens_used: 250_000,
      },
      error: null,
    });

    const result = await applyAuditTokenBudgetTopup({
      auditId: 'audit-1',
      grantedByUserId: 'user-1',
      deltaTokens: 1_000,
    });

    if (!result.ok) {
      throw new Error('expected success');
    }
    expect(result.tokens_remaining).toBe(0);
  });
});
