import { beforeEach, describe, expect, it, vi } from 'vitest';

const pilotMocks = vi.hoisted(() => ({ diagnosticIntakePilot: false }));
const fetchTokenMocks = vi.hoisted(() => ({
  fetchIntakeTokenRowForRespond: vi.fn(),
  updateIntakeTokenResponsesDraft: vi.fn(),
}));

vi.mock('../config/feature-flags.js', async importOriginal => {
  const actual = await importOriginal<typeof import('../config/feature-flags.js')>();
  return {
    ...actual,
    isDiagnosticIntakePilotEnabled: () => pilotMocks.diagnosticIntakePilot,
  };
});

vi.mock('../services/intake/intake-token.service.js', () => ({
  fetchIntakeTokenRowForRespond: fetchTokenMocks.fetchIntakeTokenRowForRespond,
  updateIntakeTokenResponsesDraft: fetchTokenMocks.updateIntakeTokenResponsesDraft,
}));

vi.mock('../services/logger.js', () => ({
  logger: { info: vi.fn(), error: vi.fn() },
}));

import { postIntakeNlDescribeController } from '../routes/intake/controllers/post-intake-nl-describe.controller.js';

const VALID_TOKEN = `${'a'.repeat(40)}`;

function createMockRes() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { status, json, res: { status } as unknown as import('express').Response };
}

describe('postIntakeNlDescribeController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pilotMocks.diagnosticIntakePilot = true;
    const future = new Date(Date.now() + 86_400_000).toISOString();
    fetchTokenMocks.fetchIntakeTokenRowForRespond.mockResolvedValue({
      id: 'token-row-1',
      expires_at: future,
      responses: {},
    });
    fetchTokenMocks.updateIntakeTokenResponsesDraft.mockResolvedValue(true);
  });

  it('returns 404 when diagnostic intake pilot is disabled', async () => {
    pilotMocks.diagnosticIntakePilot = false;
    const { status, json, res } = createMockRes();
    await postIntakeNlDescribeController(
      { params: { token: VALID_TOKEN }, body: { text: 'hello' } } as import('express').Request,
      res,
    );
    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalled();
  });

  it('returns 400 for invalid token format', async () => {
    const { status, res } = createMockRes();
    await postIntakeNlDescribeController(
      { params: { token: 'short' }, body: { text: 'hello' } } as import('express').Request,
      res,
    );
    expect(status).toHaveBeenCalledWith(400);
  });

  it('returns 404 when token row is missing', async () => {
    fetchTokenMocks.fetchIntakeTokenRowForRespond.mockResolvedValue(null);
    const { status, res } = createMockRes();
    await postIntakeNlDescribeController(
      { params: { token: VALID_TOKEN }, body: { text: 'hello' } } as import('express').Request,
      res,
    );
    expect(status).toHaveBeenCalledWith(404);
  });

  it('returns 400 when text is missing or blank', async () => {
    const { status, res } = createMockRes();
    await postIntakeNlDescribeController(
      { params: { token: VALID_TOKEN }, body: { text: '   ' } } as import('express').Request,
      res,
    );
    expect(status).toHaveBeenCalledWith(400);
  });

  it('returns 200 with authoritative merge and plan trace when text is valid', async () => {
    const { status, json, res } = createMockRes();
    await postIntakeNlDescribeController(
      { params: { token: VALID_TOKEN }, body: { text: 'We run a small hotel in Mallorca.' } } as import('express').Request,
      res,
    );
    expect(status).toHaveBeenCalledWith(200);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        ok: true,
        prefer_explicit_over_inferred: true,
        graphDraft: expect.objectContaining({
          inferred: expect.any(Array),
        }),
        authoritative: expect.objectContaining({
          merged_responses: expect.any(Object),
          applied_hints: expect.any(Array),
          skipped_hints: expect.any(Array),
        }),
        plan_trace: expect.objectContaining({
          plan: expect.any(Object),
          text: expect.any(String),
        }),
      }),
    );
    expect(fetchTokenMocks.updateIntakeTokenResponsesDraft).toHaveBeenCalled();
  });
});
