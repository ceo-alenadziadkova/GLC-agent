import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createElement, type ReactNode } from 'react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '../../lib/tanstack-react-query';

import { ORCHESTRATION_PACK_SCHEMA_VERSION } from '../../config/orchestration-contract';
import { ORCHESTRATION_LANE_LABELS, ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import type { StrategyRoadmap } from '../../data/audit/contracts/report/report-domain.types';
import type { GlcOrchestrationPackView } from '../../data/audit/contracts/report/orchestration-pack.types';
import { StrategyLabOrchestrationPanel } from './StrategyLabOrchestrationPanel';

const {
  mockPostOrchestratorPreview,
  mockGetRoadmapManifestSnapshots,
  mockGetOrchestrationPackDiffHistory,
  mockPostOrchestrationCommercialOffer,
} = vi.hoisted(() => ({
  mockPostOrchestratorPreview: vi.fn(),
  mockGetRoadmapManifestSnapshots: vi.fn(),
  mockGetOrchestrationPackDiffHistory: vi.fn(),
  mockPostOrchestrationCommercialOffer: vi.fn(),
}));

vi.mock('../../hooks/useProfile', () => ({
  useProfile: () => ({ isClient: false }),
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

vi.mock('../../data/apiService', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../data/apiService')>();
  return {
    ...actual,
    api: {
      ...actual.api,
      postOrchestratorPreview: mockPostOrchestratorPreview,
      getRoadmapManifestSnapshots: mockGetRoadmapManifestSnapshots,
      getOrchestrationPackDiffHistory: mockGetOrchestrationPackDiffHistory,
      postOrchestrationCommercialOffer: mockPostOrchestrationCommercialOffer,
    },
  };
});

function buildMinimalPack(): GlcOrchestrationPackView {
  const laneKeys = Object.keys(ORCHESTRATION_LANE_LABELS) as Array<keyof typeof ORCHESTRATION_LANE_LABELS>;
  const lanes = Object.fromEntries(laneKeys.map(k => [k, k === 'tech_delivery' ? ['node-main'] : []])) as NonNullable<
    GlcOrchestrationPackView['lanes']
  >;
  return {
    version: ORCHESTRATION_PACK_SCHEMA_VERSION,
    manifest_snapshot_id: 'snap-test-1',
    critical_path: ['node-main'],
    conflicts_resolved: [],
    graph: {
      nodes: [
        {
          id: 'node-main',
          title: 'Main node',
          domain: 'tech_infrastructure',
          lane: 'tech_delivery',
          source: 'strategy',
          analysis_depth: 'baseline',
        },
      ],
      edges: [],
    },
    lanes,
  };
}

function buildRoadmapPackStrategy(pack: GlcOrchestrationPackView): StrategyRoadmap {
  return {
    id: 'strategy-row-1',
    audit_id: 'audit-commercial-test',
    status: 'complete',
    executive_summary: null,
    overall_score: null,
    quick_wins: [],
    medium_term: [],
    strategic: [],
    scorecard: [],
    glc_orchestration_pack: pack,
    orchestration_pack_version: 1,
  };
}

const previewPayload = {
  lanes_included: ['tech_delivery'] as const,
  lanes_cut: [] as const,
  waiting_list_domains: [] as const,
  execution_compression_hint: 'none' as const,
  lane_density_band: 'standard' as const,
  confidence_callouts: [] as string[],
};

const commercialProbeResponse = {
  offers: [
    {
      domain: 'security_compliance' as const,
      value_message: 'Add compliance lane coverage',
      estimated_incremental_effort_weeks: 2,
      why_now_bullets: ['Reduces rollout risk'],
    },
  ],
  accepted_domain: null,
  base_preview: previewPayload,
  recalculated_preview: null,
  accepted_pack_result: null,
};

function createWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function TestProviders({ children }: { children: ReactNode }) {
    return createElement(
      QueryClientProvider,
      { client: qc },
      createElement(MemoryRouter, null, children),
    );
  };
}

describe('StrategyLabOrchestrationPanel commercial accept', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPostOrchestratorPreview.mockResolvedValue({ preview: previewPayload });
    mockGetRoadmapManifestSnapshots.mockResolvedValue({ snapshots: [] });
    mockGetOrchestrationPackDiffHistory.mockResolvedValue({ items: [] });
    mockPostOrchestrationCommercialOffer.mockResolvedValue(commercialProbeResponse);
  });

  it('opens accessible confirm dialog and POSTs commercial offer with accept_domain on Apply', async () => {
    const user = userEvent.setup();
    const onReload = vi.fn();
    render(
      <StrategyLabOrchestrationPanel
        auditId="audit-commercial-test"
        executionPlan={{
          selected_domains: ['tech_infrastructure'],
          depth: 'standard',
          source: 'user_selected',
        }}
        strategy={buildRoadmapPackStrategy(buildMinimalPack())}
        onReload={onReload}
        mergeStrategyLabContextInAuditCache={vi.fn()}
      />,
      { wrapper: createWrapper() },
    );

    await user.click(screen.getByText(STRATEGY_LAB_COPY.orchestrationDisclosure.commercialSummary));
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.commercialCheckCta }));

    expect(mockPostOrchestrationCommercialOffer).toHaveBeenCalledTimes(1);
    expect(mockPostOrchestrationCommercialOffer.mock.calls[0][1]).toEqual(
      expect.not.objectContaining({ accept_domain: expect.anything() }),
    );

    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.commercialAcceptCta }));

    const dialog = await screen.findByRole('alertdialog');
    expect(within(dialog).getByRole('heading', { level: 2, name: ORCHESTRATION_UI_COPY.commercialConfirmAcceptTitle })).toBeTruthy();
    expect(within(dialog).getByText(ORCHESTRATION_UI_COPY.commercialConfirmAcceptDescription)).toBeTruthy();

    await user.click(within(dialog).getByRole('button', { name: ORCHESTRATION_UI_COPY.commercialConfirmAcceptConfirm }));

    expect(mockPostOrchestrationCommercialOffer).toHaveBeenCalledTimes(2);
    expect(mockPostOrchestrationCommercialOffer.mock.calls[1][1]).toMatchObject({
      accept_domain: 'security_compliance',
    });
  });
});
