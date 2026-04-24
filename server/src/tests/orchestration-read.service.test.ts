import { describe, expect, it, vi, beforeEach } from 'vitest';

const auditRepoMocks = vi.hoisted(() => ({
  fetchAuditByIdForUser: vi.fn(),
  fetchAuditRelatedReadModel: vi.fn(),
}));

const roadmapMocks = vi.hoisted(() => ({
  fetchRoadmapManifestSnapshotForAudit: vi.fn(),
  fetchLatestRoadmapManifestSnapshotIdForAudit: vi.fn(),
}));

vi.mock('../repositories/audits/audit-read-model.repository.js', () => ({
  fetchAuditByIdForUser: auditRepoMocks.fetchAuditByIdForUser,
  fetchAuditRelatedReadModel: auditRepoMocks.fetchAuditRelatedReadModel,
}));

vi.mock('../services/orchestration/roadmap-manifest.service.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../services/orchestration/roadmap-manifest.service.js')>();
  return {
    ...actual,
    fetchRoadmapManifestSnapshotForAudit: roadmapMocks.fetchRoadmapManifestSnapshotForAudit,
    fetchLatestRoadmapManifestSnapshotIdForAudit: roadmapMocks.fetchLatestRoadmapManifestSnapshotIdForAudit,
  };
});

import { StrategyInitiativeSchema } from '../schemas/domain-output.js';
import { RoadmapManifestMismatchError } from '../services/orchestration/roadmap-manifest.service.js';
import { buildOrchestrationPackForAudit } from '../services/orchestration/orchestration-read.service.js';

const SNAPSHOT_ID = '11111111-1111-4111-8111-111111111111';
const AUDIT_ID = '22222222-2222-4222-8222-222222222222';
const USER_ID = '33333333-3333-4333-8333-333333333333';

function minimalStrategyInitiative(id: string) {
  return StrategyInitiativeSchema.parse({
    id,
    title: `Title ${id}`,
    description: 'Desc'.repeat(4),
    domain: 'marketing_utp' as const,
    stage: 'growth' as const,
    priority: 'medium' as const,
    impact: 'medium' as const,
    effort: 'medium' as const,
    confidence: 0.8,
    context: { signals: ['S'] },
    outcome: { description: 'Out' },
    scope: { includes: ['A'], excludes: ['B'] },
    execution_paths: [{ type: 'fast' as const, description: 'Q', time_estimate: '1w' }],
    dependencies: [],
    decision: { why_this: ['W'] },
    evidence: { sources: [{ domain_key: 'marketing_utp' as const, signal: 'x' }] },
  });
}

function fulfilled<T>(data: T | null) {
  return { status: 'fulfilled' as const, value: { data, error: null } };
}

describe('buildOrchestrationPackForAudit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    roadmapMocks.fetchLatestRoadmapManifestSnapshotIdForAudit.mockResolvedValue({ id: SNAPSHOT_ID });
  });

  it('returns a pack when audit, manifest, and strategy initiatives are present', async () => {
    const initiative = minimalStrategyInitiative('read-1');
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        product_mode: 'complete',
        execution_plan: {
          selected_domains: ['marketing_utp', 'ux_conversion'],
          depth: 'standard',
          source: 'user_selected',
          include_strategy: true,
        },
      },
      error: null,
    });
    roadmapMocks.fetchRoadmapManifestSnapshotForAudit.mockResolvedValue({
      id: SNAPSHOT_ID,
      payload: {
        selected_domains: ['ux_conversion', 'marketing_utp'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      },
    });
    auditRepoMocks.fetchAuditRelatedReadModel.mockResolvedValue([
      fulfilled({}),
      fulfilled([]),
      fulfilled({
        audit_id: AUDIT_ID,
        quick_wins: [initiative],
        medium_term: [minimalStrategyInitiative('read-2')],
        strategic: [minimalStrategyInitiative('read-3')],
        schema_version: 2,
      }),
      fulfilled([]),
      fulfilled(null),
    ]);

    const pack = await buildOrchestrationPackForAudit({
      auditId: AUDIT_ID,
      userId: USER_ID,
      manifestSnapshotId: SNAPSHOT_ID,
    });

    expect(pack).not.toBeNull();
    expect(pack!.manifest_snapshot_id).toBe(SNAPSHOT_ID);
    expect(pack!.graph.nodes.map((n) => n.id).sort()).toEqual(['read-1', 'read-2', 'read-3'].sort());
  });

  it('is deterministic for identical inputs (idempotent build output)', async () => {
    const initiative = minimalStrategyInitiative('stable-1');
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        product_mode: 'complete',
        execution_plan: {
          selected_domains: ['marketing_utp', 'ux_conversion'],
          depth: 'standard',
          source: 'user_selected',
          include_strategy: true,
        },
      },
      error: null,
    });
    roadmapMocks.fetchRoadmapManifestSnapshotForAudit.mockResolvedValue({
      id: SNAPSHOT_ID,
      payload: {
        selected_domains: ['ux_conversion', 'marketing_utp'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      },
    });
    auditRepoMocks.fetchAuditRelatedReadModel.mockResolvedValue([
      fulfilled({}),
      fulfilled([]),
      fulfilled({
        audit_id: AUDIT_ID,
        quick_wins: [initiative],
        medium_term: [minimalStrategyInitiative('stable-2')],
        strategic: [minimalStrategyInitiative('stable-3')],
        schema_version: 2,
      }),
      fulfilled([]),
      fulfilled(null),
    ]);

    const first = await buildOrchestrationPackForAudit({
      auditId: AUDIT_ID,
      userId: USER_ID,
      manifestSnapshotId: SNAPSHOT_ID,
    });
    const second = await buildOrchestrationPackForAudit({
      auditId: AUDIT_ID,
      userId: USER_ID,
      manifestSnapshotId: SNAPSHOT_ID,
    });

    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(second).toEqual(first);
  });

  it('returns null when manifest snapshot is missing', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        product_mode: 'complete',
        execution_plan: {
          selected_domains: ['marketing_utp'],
          depth: 'standard',
          source: 'user_selected',
          include_strategy: true,
        },
      },
      error: null,
    });
    roadmapMocks.fetchRoadmapManifestSnapshotForAudit.mockResolvedValue(null);

    const pack = await buildOrchestrationPackForAudit({
      auditId: AUDIT_ID,
      userId: USER_ID,
      manifestSnapshotId: SNAPSHOT_ID,
    });

    expect(pack).toBeNull();
  });

  it('returns null when manifest snapshot is stale (not latest)', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        product_mode: 'complete',
        execution_plan: {
          selected_domains: ['marketing_utp'],
          depth: 'standard',
          source: 'user_selected',
          include_strategy: true,
        },
      },
      error: null,
    });
    roadmapMocks.fetchRoadmapManifestSnapshotForAudit.mockResolvedValue({
      id: SNAPSHOT_ID,
      payload: {
        selected_domains: ['marketing_utp'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      },
    });
    roadmapMocks.fetchLatestRoadmapManifestSnapshotIdForAudit.mockResolvedValue({
      id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    });

    const pack = await buildOrchestrationPackForAudit({
      auditId: AUDIT_ID,
      userId: USER_ID,
      manifestSnapshotId: SNAPSHOT_ID,
    });

    expect(pack).toBeNull();
  });

  it('throws RoadmapManifestMismatchError when manifest domains disagree with execution_plan', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        product_mode: 'complete',
        execution_plan: {
          selected_domains: ['marketing_utp'],
          depth: 'standard',
          source: 'user_selected',
          include_strategy: true,
        },
      },
      error: null,
    });
    roadmapMocks.fetchRoadmapManifestSnapshotForAudit.mockResolvedValue({
      id: SNAPSHOT_ID,
      payload: {
        selected_domains: ['marketing_utp', 'ux_conversion'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      },
    });

    await expect(
      buildOrchestrationPackForAudit({
        auditId: AUDIT_ID,
        userId: USER_ID,
        manifestSnapshotId: SNAPSHOT_ID,
      }),
    ).rejects.toBeInstanceOf(RoadmapManifestMismatchError);
  });

  it('returns null when strategy row is missing', async () => {
    auditRepoMocks.fetchAuditByIdForUser.mockResolvedValue({
      data: {
        id: AUDIT_ID,
        product_mode: 'complete',
        execution_plan: {
          selected_domains: ['marketing_utp'],
          depth: 'standard',
          source: 'user_selected',
          include_strategy: true,
        },
      },
      error: null,
    });
    roadmapMocks.fetchRoadmapManifestSnapshotForAudit.mockResolvedValue({
      id: SNAPSHOT_ID,
      payload: {
        selected_domains: ['marketing_utp'],
        change_scenario: 'hybrid',
        season_preset: 'rolling_90d',
      },
    });
    auditRepoMocks.fetchAuditRelatedReadModel.mockResolvedValue([
      fulfilled({}),
      fulfilled([]),
      fulfilled(null),
      fulfilled([]),
      fulfilled(null),
    ]);

    const pack = await buildOrchestrationPackForAudit({
      auditId: AUDIT_ID,
      userId: USER_ID,
      manifestSnapshotId: SNAPSHOT_ID,
    });

    expect(pack).toBeNull();
  });
});
