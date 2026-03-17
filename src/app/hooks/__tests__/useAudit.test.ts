import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

// ─── Hoisted mocks (available before vi.mock hoisting) ─────────────────────

const { mockGetAudit } = vi.hoisted(() => ({
  mockGetAudit: vi.fn(),
}));

vi.mock('../../data/apiService', () => ({
  api: {
    getAudit: mockGetAudit,
  },
}));

// Import hook AFTER mock
import { useAudit } from '../useAudit';

// ─── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
});

describe('useAudit', () => {
  it('starts with loading=true when auditId is provided', () => {
    // getAudit never resolves — simulates in-flight request
    mockGetAudit.mockImplementation(() => new Promise(() => {}));

    const { result } = renderHook(() => useAudit('audit-123'));

    expect(result.current.loading).toBe(true);
    expect(result.current.audit).toBeNull();
  });

  it('sets audit and clears loading on successful fetch', async () => {
    const fakeAudit = { meta: { id: 'audit-123', status: 'completed' }, domains: {} };
    mockGetAudit.mockResolvedValue(fakeAudit);

    const { result } = renderHook(() => useAudit('audit-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.audit).toEqual(fakeAudit);
    expect(result.current.error).toBeNull();
  });

  it('sets error and clears loading when fetch fails', async () => {
    mockGetAudit.mockRejectedValue(new Error('Audit not found'));

    const { result } = renderHook(() => useAudit('audit-123'));

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Audit not found');
    expect(result.current.audit).toBeNull();
  });
});
