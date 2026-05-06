import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import { STRATEGY_LAB_COPY } from '../../../config/strategy-lab-copy';
import { PIPELINE_STRATEGY_PHASE_INDEX } from '../../../config/pipeline-phase-policy';
import type { StrategyInitiative } from '../../../data/audit/contracts/report/report-domain.types';
import { StrategyLabInitiativeEditDrawer } from '../StrategyLabInitiativeEditDrawer';

const patchSpy = vi.fn();

vi.mock('../../../data/apiService', () => ({
  api: {
    patchPipelinePhaseResult: (...args: unknown[]) => patchSpy(...args),
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

describe('StrategyLabInitiativeEditDrawer', () => {
  const auditId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
  const baseInitiative: StrategyInitiative = {
    id: 'init-1',
    title: 'Original title',
    description: 'Original description text that is long enough.',
    impact: 'medium',
    effort: 'medium',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    patchSpy.mockResolvedValue({ ok: true, phase_number: PIPELINE_STRATEGY_PHASE_INDEX, updated: true });
  });

  it('renders title field and checkbox unchecked when initiative has no board_identity_key', async () => {
    render(
      <StrategyLabInitiativeEditDrawer
        open
        onOpenChange={vi.fn()}
        auditId={auditId}
        bucket="quick_wins"
        initiative={baseInitiative}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByLabelText(STRATEGY_LAB_COPY.boardIdentity.titleLabel)).toHaveValue('Original title');
    const cb = screen.getByRole('checkbox', { name: STRATEGY_LAB_COPY.boardIdentity.checkboxLabel });
    expect(cb).not.toBeChecked();
  });

  it('shows rename warning when title changes and identity checkbox is unchecked', async () => {
    const user = userEvent.setup();
    render(
      <StrategyLabInitiativeEditDrawer
        open
        onOpenChange={vi.fn()}
        auditId={auditId}
        bucket="quick_wins"
        initiative={baseInitiative}
        onSaved={vi.fn()}
      />,
    );

    await user.clear(screen.getByLabelText(STRATEGY_LAB_COPY.boardIdentity.titleLabel));
    await user.type(screen.getByLabelText(STRATEGY_LAB_COPY.boardIdentity.titleLabel), 'Renamed');

    expect(screen.getByText(STRATEGY_LAB_COPY.boardIdentity.warningWhenOff)).toBeInTheDocument();
  });

  it('save with checkbox checked sends board_identity_key string', async () => {
    const user = userEvent.setup();
    const onSaved = vi.fn();
    render(
      <StrategyLabInitiativeEditDrawer
        open
        onOpenChange={vi.fn()}
        auditId={auditId}
        bucket="medium_term"
        initiative={baseInitiative}
        onSaved={onSaved}
      />,
    );

    await user.click(screen.getByRole('checkbox', { name: STRATEGY_LAB_COPY.boardIdentity.checkboxLabel }));
    await user.click(screen.getByRole('button', { name: STRATEGY_LAB_COPY.boardIdentity.saveInitiative }));

    expect(patchSpy).toHaveBeenCalledWith(
      auditId,
      PIPELINE_STRATEGY_PHASE_INDEX,
      expect.objectContaining({
        result: {
          medium_term: [
            expect.objectContaining({
              id: 'init-1',
              board_identity_key: 'medium_term:init-1',
            }),
          ],
        },
      }),
    );
    expect(onSaved).toHaveBeenCalled();
  });

  it('save with checkbox unchecked sends board_identity_key null', async () => {
    const user = userEvent.setup();
    const withKey: StrategyInitiative = {
      ...baseInitiative,
      board_identity_key: 'existing-key',
    };
    render(
      <StrategyLabInitiativeEditDrawer
        open
        onOpenChange={vi.fn()}
        auditId={auditId}
        bucket="strategic"
        initiative={withKey}
        onSaved={vi.fn()}
      />,
    );

    expect(screen.getByRole('checkbox', { name: STRATEGY_LAB_COPY.boardIdentity.checkboxLabel })).toBeChecked();
    await user.click(screen.getByRole('checkbox', { name: STRATEGY_LAB_COPY.boardIdentity.checkboxLabel }));
    await user.click(screen.getByRole('button', { name: STRATEGY_LAB_COPY.boardIdentity.saveInitiative }));

    expect(patchSpy).toHaveBeenCalledWith(
      auditId,
      PIPELINE_STRATEGY_PHASE_INDEX,
      expect.objectContaining({
        result: {
          strategic: [
            expect.objectContaining({
              id: 'init-1',
              board_identity_key: null,
            }),
          ],
        },
      }),
    );
  });
});
