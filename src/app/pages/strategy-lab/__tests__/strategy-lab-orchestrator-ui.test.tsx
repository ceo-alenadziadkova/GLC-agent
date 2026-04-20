import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import type { GlcOrchestrationPackView } from '../../../data/audit/contracts/report/orchestration-pack.types';
import { STRATEGY_LAB_COPY } from '../../../config/strategy-lab-copy';
import { OrchestrationNodeDetailCard } from '../OrchestrationNodeDetailCard';
import { StrategyLabOrchestratorListBody } from '../StrategyLabOrchestratorListBody';

const PACK_FIXTURE: GlcOrchestrationPackView = {
  version: 2,
  graph: {
    nodes: [
      { id: 'n1', title: 'Launch trust page', domain: 'security_compliance', lane: 'risk_compliance' },
      { id: 'n2', title: 'Fix signup CTA', domain: 'ux_conversion', lane: 'product_change' },
    ],
    edges: [{ from: 'n1', to: 'n2', weight: 1 }],
  },
  lanes: {
    product_change: ['n2'],
    tech_delivery: [],
    marketing_narrative: [],
    seo: [],
    processes_automation: [],
    risk_compliance: ['n1'],
  },
  critical_path: ['n1', 'n2'],
  conflicts_resolved: [{ id: 'c1', summary: 'Capacity overlap', resolution: 'Move CTA task after trust page' }],
  manifest_snapshot_id: '00000000-0000-4000-8000-000000000101',
};

describe('strategy lab orchestrator ui', () => {
  it('renders now-tab nodes and selects a node on click', () => {
    const onSelectNode = vi.fn<(id: string | null) => void>();
    render(
      <StrategyLabOrchestratorListBody
        pack={PACK_FIXTURE}
        tab="now"
        selectedNodeId={null}
        onSelectNode={onSelectNode}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /Launch trust page/i }));
    expect(onSelectNode).toHaveBeenCalledWith('n1');
  });

  it('renders selected node details and clears selection', () => {
    const onClear = vi.fn();
    render(<OrchestrationNodeDetailCard pack={PACK_FIXTURE} nodeId="n1" onClear={onClear} />);

    expect(screen.getByText('Launch trust page')).toBeInTheDocument();
    expect(screen.getByText('Lane')).toBeInTheDocument();
    expect(screen.getByText('Domain')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Clear/i }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('dependencies tab shows pack graph heading and list', () => {
    const onSelectNode = vi.fn<(id: string | null) => void>();
    render(
      <StrategyLabOrchestratorListBody
        pack={PACK_FIXTURE}
        tab="dependencies"
        selectedNodeId={null}
        onSelectNode={onSelectNode}
      />,
    );

    expect(screen.getByRole('heading', { name: STRATEGY_LAB_COPY.packDependencyMap.sectionTitle })).toBeInTheDocument();
    expect(screen.getByText(STRATEGY_LAB_COPY.orchestratorTabs.dependenciesListTitle)).toBeInTheDocument();
  });
});
