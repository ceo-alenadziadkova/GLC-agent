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
          eq: vi.fn(() => ({
            select: vi.fn(async () => supabaseMocks.updateSelectResult),
          })),
        })),
      })),
    })),
  },
}));

import { GLC_ORCHESTRATION_PACK_SCHEMA_VERSION } from '../config/orchestration-graph-policy.js';
import { ORCHESTRATION_LANE_IDS } from '../config/orchestration-lanes.js';
import {
  fetchOrchestrationPackRevisionHistoryForUser,
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
    phase_diagnostic: {
      dominant_constraint: 'capacity',
      constraint_chain: ['capacity', 'technical_debt'],
    },
    routing_profile: {
      strategy: 'toc_dynamic_routing_v1',
      domain_weights: { marketing_utp: 1 },
    },
  };
}

describe('persistGlcOrchestrationPack', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    supabaseMocks.selectResult = {
      data: { orchestration_pack_version: 0, glc_orchestration_pack: null },
      error: null,
    };
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
    expect(out.last_revision_diff).toBeNull();
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
    expect(out.last_revision_diff).toBeNull();
  });

  it('stores revision diff when prior version is at least 1', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: { id: AUDIT_ID },
      error: null,
    });
    const prior = minimalPack();
    supabaseMocks.selectResult = {
      data: { orchestration_pack_version: 1, glc_orchestration_pack: prior },
      error: null,
    };

    const next: GlcOrchestrationPack = {
      ...prior,
      graph: {
        ...prior.graph,
        nodes: [
          ...prior.graph.nodes,
          {
            id: 'n2',
            title: 'T2',
            domain: 'ux_conversion',
            lane: 'product_change',
          },
        ],
      },
      lanes: Object.fromEntries(
        ORCHESTRATION_LANE_IDS.map(l => [
          l,
          l === 'marketing_narrative' ? ['n1'] : l === 'product_change' ? ['n2'] : [],
        ]),
      ) as GlcOrchestrationPack['lanes'],
      critical_path: ['n1', 'n2'],
    };

    const out = await persistGlcOrchestrationPack({
      auditId: AUDIT_ID,
      userId: USER_ID,
      pack: next,
    });

    expect(out.error).toBeNull();
    expect(out.orchestration_pack_version).toBe(2);
    expect(out.last_revision_diff).not.toBeNull();
    expect(out.last_revision_diff?.nodes_added).toContain('n2');
    expect(out.last_revision_diff?.from_version).toBe(1);
    expect(out.last_revision_diff?.to_version).toBe(2);
  });

  it('regenerates roadmap version after manifest change and stores diff', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: { id: AUDIT_ID },
      error: null,
    });
    const prior = minimalPack();
    supabaseMocks.selectResult = {
      data: { orchestration_pack_version: 3, glc_orchestration_pack: prior },
      error: null,
    };

    const regenerated: GlcOrchestrationPack = {
      ...prior,
      manifest_snapshot_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      graph: {
        ...prior.graph,
        nodes: [
          prior.graph.nodes[0],
          {
            id: 'n3',
            title: 'Regenerated path',
            domain: 'seo_digital',
            lane: 'seo',
          },
        ],
      },
      lanes: Object.fromEntries(
        ORCHESTRATION_LANE_IDS.map(l => [
          l,
          l === 'marketing_narrative' ? ['n1'] : l === 'seo' ? ['n3'] : [],
        ]),
      ) as GlcOrchestrationPack['lanes'],
      critical_path: ['n1', 'n3'],
    };

    const out = await persistGlcOrchestrationPack({
      auditId: AUDIT_ID,
      userId: USER_ID,
      pack: regenerated,
    });

    expect(out.error).toBeNull();
    expect(out.orchestration_pack_version).toBe(4);
    expect(out.last_revision_diff?.from_version).toBe(3);
    expect(out.last_revision_diff?.to_version).toBe(4);
    expect(out.last_revision_diff?.nodes_added).toContain('n3');
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

  it('returns error when optimistic update retry budget is exhausted', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: { id: AUDIT_ID },
      error: null,
    });
    supabaseMocks.selectResult = {
      data: { orchestration_pack_version: 2, glc_orchestration_pack: minimalPack() },
      error: null,
    };
    supabaseMocks.updateSelectResult = { data: [], error: null };

    const out = await persistGlcOrchestrationPack({
      auditId: AUDIT_ID,
      userId: USER_ID,
      pack: minimalPack(),
    });

    expect(out.error?.message).toContain('retry budget exhausted');
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
      data: {
        glc_orchestration_pack: null,
        orchestration_pack_version: 0,
        glc_orchestration_last_revision_diff: null,
      },
      error: null,
    };

    const out = await fetchPersistedGlcOrchestrationPackForUser({
      auditId: AUDIT_ID,
      userId: USER_ID,
    });

    expect(out).toEqual({
      status: 'ok',
      pack: null,
      orchestration_pack_version: 0,
      last_revision_diff: null,
      revision_history: [],
    });
  });

  it('returns ok with parsed pack when JSON is valid', async () => {
    const pack = minimalPack();
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: { id: AUDIT_ID },
      error: null,
    });
    supabaseMocks.selectResult = {
      data: {
        glc_orchestration_pack: pack,
        orchestration_pack_version: 2,
        glc_orchestration_last_revision_diff: null,
      },
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
      expect(out.last_revision_diff).toBeNull();
      expect(out.revision_history).toEqual([]);
    }
  });
});

describe('fetchOrchestrationPackRevisionHistoryForUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns multi-revision history when available', async () => {
    const pack = minimalPack();
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: { id: AUDIT_ID },
      error: null,
    });
    supabaseMocks.selectResult = {
      data: {
        glc_orchestration_pack: pack,
        orchestration_pack_version: 4,
        glc_orchestration_last_revision_diff: null,
        glc_orchestration_revision_history: [
          {
            from_version: 3,
            to_version: 4,
            diff: {
              from_version: 3,
              to_version: 4,
              nodes_added: ['n4'],
              nodes_removed: [],
              nodes_lane_changed: [],
              edges_added: [],
              edges_removed: [],
              critical_path_changed: false,
              conflicts_resolved_before: 0,
              conflicts_resolved_after: 0,
            },
          },
          {
            from_version: 2,
            to_version: 3,
            diff: {
              from_version: 2,
              to_version: 3,
              nodes_added: ['n3'],
              nodes_removed: [],
              nodes_lane_changed: [],
              edges_added: [],
              edges_removed: [],
              critical_path_changed: false,
              conflicts_resolved_before: 0,
              conflicts_resolved_after: 0,
            },
          },
        ],
      },
      error: null,
    };

    const out = await fetchOrchestrationPackRevisionHistoryForUser({
      auditId: AUDIT_ID,
      userId: USER_ID,
      limit: 10,
    });
    expect(out.status).toBe('ok');
    if (out.status === 'ok') {
      expect(out.items).toHaveLength(2);
      expect(out.items[0]?.to_version).toBe(4);
      expect(out.items[1]?.to_version).toBe(3);
    }
  });

  it('falls back to last_revision_diff when history array is empty', async () => {
    const pack = minimalPack();
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: { id: AUDIT_ID },
      error: null,
    });
    supabaseMocks.selectResult = {
      data: {
        glc_orchestration_pack: pack,
        orchestration_pack_version: 2,
        glc_orchestration_last_revision_diff: {
          from_version: 1,
          to_version: 2,
          nodes_added: ['n2'],
          nodes_removed: [],
          nodes_lane_changed: [],
          edges_added: [],
          edges_removed: [],
          critical_path_changed: false,
          conflicts_resolved_before: 0,
          conflicts_resolved_after: 0,
        },
        glc_orchestration_revision_history: [],
      },
      error: null,
    };
    const out = await fetchOrchestrationPackRevisionHistoryForUser({
      auditId: AUDIT_ID,
      userId: USER_ID,
      limit: 10,
    });
    expect(out.status).toBe('ok');
    if (out.status === 'ok') {
      expect(out.items).toHaveLength(1);
      expect(out.items[0]?.to_version).toBe(2);
    }
  });
});
