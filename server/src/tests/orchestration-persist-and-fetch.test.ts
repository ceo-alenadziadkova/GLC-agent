import { describe, expect, it, vi, beforeEach } from 'vitest';

const auditRepoMocks = vi.hoisted(() => ({
  fetchAuditByIdForUser: vi.fn(),
}));

const supabaseMocks = vi.hoisted(() => ({
  selectResult: { data: null as unknown, error: null as unknown },
  updateSelectResult: { data: null as unknown, error: null as unknown },
}));

vi.mock('../repositories/audits/audit-read-model.repository.js', () => ({
  fetchAuditByIdForUser: auditRepoMocks.fetchAuditByIdForUser,
}));

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => supabaseMocks.selectResult),
        })),
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(async () => supabaseMocks.updateSelectResult),
        })),
      })),
    })),
  },
}));

import { GLC_ORCHESTRATION_PACK_SCHEMA_VERSION } from '../config/orchestration-graph-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import {
  fetchPersistedGlcOrchestrationPackForUser,
  persistGlcOrchestrationPack,
} from '../services/orchestration/orchestration-read.service.js';
import type { GlcOrchestrationPack } from '../schemas/glc-orchestration-pack.js';

const AUDIT_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';
const SNAPSHOT_ID = '11111111-1111-4111-8111-111111111111';

function minimalPack(): GlcOrchestrationPack {
  return {
    version: GLC_ORCHESTRATION_PACK_SCHEMA_VERSION,
    graph: {
      nodes: [
        {
          id: 'n1',
          title: 'T1',
          domain: 'marketing_utp',
          lane: 'marketing_narrative',
        },
      ],
      edges: [],
    },
    lanes: Object.fromEntries(ORCHESTRATION_LANE_IDS.map(l => [l, l === 'marketing_narrative' ? ['n1'] : []])) as GlcOrchestrationPack['lanes'],
    critical_path: ['n1'],
    conflicts_resolved: [],
    manifest_snapshot_id: SNAPSHOT_ID,
  };
}

describe('persistGlcOrchestrationPack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.selectResult = { data: { orchestration_pack_version: 0 }, error: null };
    supabaseMocks.updateSelectResult = { data: [{ audit_id: AUDIT_ID }], error: null };
  });

  it('returns error when audit is not accessible', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({ data: null, error: { message: 'x' } });

    const out = await persistGlcOrchestrationPack({
      auditId: AUDIT_ID,
      userId: USER_ID,
      pack: minimalPack(),
    });

    expect(out.error).not.toBeNull();
    expect(out.orchestration_pack_version).toBe(0);
  });

  it('increments version when audit is accessible', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: { id: AUDIT_ID },
      error: null,
    });

    const out = await persistGlcOrchestrationPack({
      auditId: AUDIT_ID,
      userId: USER_ID,
      pack: minimalPack(),
    });

    expect(out.error).toBeNull();
    expect(out.orchestration_pack_version).toBe(1);
  });

  it('returns error when audit_strategy row is missing', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: { id: AUDIT_ID },
      error: null,
    });
    supabaseMocks.selectResult = { data: null, error: null };

    const out = await persistGlcOrchestrationPack({
      auditId: AUDIT_ID,
      userId: USER_ID,
      pack: minimalPack(),
    });

    expect(out.error?.message).toContain('audit_strategy row missing');
    expect(out.orchestration_pack_version).toBe(0);
  });

  it('returns error when update affects no rows', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: { id: AUDIT_ID },
      error: null,
    });
    supabaseMocks.selectResult = { data: { orchestration_pack_version: 2 }, error: null };
    supabaseMocks.updateSelectResult = { data: [], error: null };

    const out = await persistGlcOrchestrationPack({
      auditId: AUDIT_ID,
      userId: USER_ID,
      pack: minimalPack(),
    });

    expect(out.error?.message).toContain('no rows');
    expect(out.orchestration_pack_version).toBe(2);
  });
});

describe('fetchPersistedGlcOrchestrationPackForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns not_found when audit is missing', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({ data: null, error: null });

    const out = await fetchPersistedGlcOrchestrationPackForUser({
      auditId: AUDIT_ID,
      userId: USER_ID,
    });

    expect(out).toEqual({ status: 'not_found' });
  });

  it('returns ok with null pack when strategy row has no JSON', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: { id: AUDIT_ID },
      error: null,
    });
    supabaseMocks.selectResult = {
      data: { glc_orchestration_pack: null, orchestration_pack_version: 0 },
      error: null,
    };

    const out = await fetchPersistedGlcOrchestrationPackForUser({
      auditId: AUDIT_ID,
      userId: USER_ID,
    });

    expect(out).toEqual({ status: 'ok', pack: null, orchestration_pack_version: 0 });
  });

  it('returns ok with parsed pack when JSON is valid', async () => {
    const pack = minimalPack();
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: { id: AUDIT_ID },
      error: null,
    });
    supabaseMocks.selectResult = {
      data: { glc_orchestration_pack: pack, orchestration_pack_version: 2 },
      error: null,
    };

    const out = await fetchPersistedGlcOrchestrationPackForUser({
      auditId: AUDIT_ID,
      userId: USER_ID,
    });

    expect(out.status).toBe('ok');
    if (out.status === 'ok') {
      expect(out.orchestration_pack_version).toBe(2);
      expect(out.pack?.manifest_snapshot_id).toBe(SNAPSHOT_ID);
    }
  });
});
