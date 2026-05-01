import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import type { GlcOrchestrationPackView } from '../../../data/audit/contracts/report/orchestration-pack.types';
import { ORCHESTRATION_UI_LIMITS } from '../../../config/orchestration-ui-limits';
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
  it('exposes the orchestration-first copy keys in the SSOT (no legacy initiative tabs)', () => {
    expect(STRATEGY_LAB_COPY.stepsStrip.step1Title.length).toBeGreaterThan(0);
    expect(STRATEGY_LAB_COPY.stepsStrip.step2Title.length).toBeGreaterThan(0);
    expect(STRATEGY_LAB_COPY.stepsStrip.step3Title.length).toBeGreaterThan(0);
    expect(STRATEGY_LAB_COPY.orchestrationDisclosure.advancedSummary.length).toBeGreaterThan(0);
    expect(STRATEGY_LAB_COPY.orchestrationDisclosure.snapshotHistorySummary.length).toBeGreaterThan(0);
    expect(
      // Legacy timeframe tabs and roadmap markdown export keys must no longer be reachable.
      (STRATEGY_LAB_COPY as unknown as { tabLabels?: unknown }).tabLabels,
    ).toBeUndefined();
    expect(
      (STRATEGY_LAB_COPY as unknown as { pageNav?: unknown }).pageNav,
    ).toBeUndefined();
  });

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

  it('risks tab shows truncation hint and expands to full conflict list when over limit', () => {
    const max = ORCHESTRATION_UI_LIMITS.orchestratorRisksMaxItems;
    const total = max + 1;
    const manyConflicts: GlcOrchestrationPackView['conflicts_resolved'] = Array.from({ length: total }, (_, i) => ({
      id: `c-${i}`,
      summary: `Conflict summary ${i}`,
      resolution: 'synthesis_applied',
    }));

    const onSelectNode = vi.fn<(id: string | null) => void>();
    const packHeavy: GlcOrchestrationPackView = {
      ...PACK_FIXTURE,
      conflicts_resolved: manyConflicts,
    };

    render(
      <StrategyLabOrchestratorListBody pack={packHeavy} tab="risks" selectedNodeId={null} onSelectNode={onSelectNode} />,
    );

    const truncationLine = STRATEGY_LAB_COPY.orchestratorTabs.risksShownOfTotal
      .replace('{shown}', String(max))
      .replace('{total}', String(total));
    expect(screen.getByText(truncationLine)).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(truncationLine);
    expect(screen.getByText('Conflict summary 0')).toBeInTheDocument();
    expect(screen.queryByText(`Conflict summary ${max}`)).not.toBeInTheDocument();

    const expandBtn = screen.getByRole('button', { name: STRATEGY_LAB_COPY.orchestratorTabs.risksShowAll });
    expect(expandBtn).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expandBtn);
    expect(expandBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText(`Conflict summary ${max}`)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: STRATEGY_LAB_COPY.orchestratorTabs.risksShowFewer }));
    expect(screen.queryByText(`Conflict summary ${max}`)).not.toBeInTheDocument();
  });
});
