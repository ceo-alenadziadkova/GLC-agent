import { describe, expect, it } from 'vitest';
import {
  assertNotCancelled,
  assertPipelineAccess,
  assertPipelineRole,
  assertTokenBudgetAvailable,
  isPipelinePhaseActive,
  isPipelineTerminal,
} from '../domain/pipeline-route.guards.js';

describe('pipeline-route.guards', () => {
  it('rejects unsupported roles', () => {
    const result = assertPipelineRole('admin' as never);
    expect(result).not.toBeNull();
    expect(result?.status).toBe(403);
  });

  it('checks consultant/client ownership access', () => {
    const audit = { user_id: 'consultant-1', client_id: 'client-1' };
    expect(assertPipelineAccess(audit, 'consultant-1', 'consultant')).toBeNull();
    expect(assertPipelineAccess(audit, 'client-1', 'client')).toBeNull();
    expect(assertPipelineAccess(audit, 'client-2', 'client')).not.toBeNull();
  });

  it('detects cancelled and exhausted token budget', () => {
    expect(assertNotCancelled('cancelled')?.status).toBe(400);
    expect(assertTokenBudgetAvailable({ status: 'created', tokens_used: 10, token_budget: 10 })?.status).toBe(400);
  });

  it('passes the token-budget guard after a top-up raises token_budget above tokens_used', () => {
    const exhausted = { status: 'created', tokens_used: 200_000, token_budget: 200_000 };
    expect(assertTokenBudgetAvailable(exhausted)?.status).toBe(400);

    // Simulating a successful platform-admin top-up via apply_audit_token_budget_topup RPC.
    const afterTopup = { ...exhausted, token_budget: exhausted.token_budget + 50_000 };
    expect(assertTokenBudgetAvailable(afterTopup)).toBeNull();
  });

  it('identifies active and terminal statuses', () => {
    expect(isPipelinePhaseActive('recon')).toBe(true);
    expect(isPipelineTerminal('completed')).toBe(true);
  });
});
