import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const { patchMock } = vi.hoisted(() => ({ patchMock: vi.fn() }));

vi.mock('../../../../data/apiService', () => ({
  api: {
    patchAuditTokenBudget: patchMock,
  },
}));

import { AdminTokenBudgetTopupBanner } from '../AdminTokenBudgetTopupBanner';
import { PIPELINE_MONITOR_COPY as PM } from '../../../../config/pipeline-monitor-copy';
import { PIPELINE_API_ERROR_CODES } from '../../../../config/pipeline-api-error-codes';

const SUCCESS_PAYLOAD = {
  grant_id: 'grant-1',
  previous_budget: 200_000,
  token_budget: 250_000,
  tokens_used: 199_000,
  tokens_remaining: 51_000,
};

const STATE_LOW = {
  status: 'review',
  current_phase: 3,
  tokens_used: 190_000,
  token_budget: 200_000,
  events: [],
  reviews: [],
};

const STATE_HEALTHY = {
  status: 'review',
  current_phase: 3,
  tokens_used: 50_000,
  token_budget: 200_000,
  events: [],
  reviews: [],
};

const STATE_EXHAUSTED = {
  status: 'failed',
  current_phase: 3,
  tokens_used: 200_000,
  token_budget: 200_000,
  events: [],
  reviews: [],
};

function renderBanner(overrides: Partial<React.ComponentProps<typeof AdminTokenBudgetTopupBanner>> = {}) {
  const onTopupSuccess = vi.fn().mockResolvedValue(undefined);
  const props: React.ComponentProps<typeof AdminTokenBudgetTopupBanner> = {
    auditId: 'audit-1',
    pipelineState: STATE_LOW,
    pipelineErrorExtras: null,
    canManagePlatformSettings: true,
    isClient: false,
    onTopupSuccess,
    ...overrides,
  };
  const utils = render(<AdminTokenBudgetTopupBanner {...props} />);
  return { ...utils, onTopupSuccess };
}

describe('AdminTokenBudgetTopupBanner', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('does not render for clients', () => {
    const { container } = renderBanner({ isClient: true });
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render for non-platform-admin consultants', () => {
    const { container } = renderBanner({ canManagePlatformSettings: false });
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render for platform admins when budget is healthy and no exhausted error', () => {
    const { container } = renderBanner({
      pipelineState: STATE_HEALTHY,
      pipelineErrorExtras: null,
    });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the warning banner for platform admins when remaining budget is at or below low threshold', () => {
    renderBanner({ pipelineState: STATE_LOW });
    expect(screen.getByText(PM.adminTokenBudgetTopup.lowTitle)).toBeInTheDocument();
  });

  it('shows the danger banner when pipeline error is PIPELINE_TOKEN_BUDGET_EXCEEDED', () => {
    renderBanner({
      pipelineState: STATE_EXHAUSTED,
      pipelineErrorExtras: { code: PIPELINE_API_ERROR_CODES.TOKEN_BUDGET_EXCEEDED, details: null },
    });
    expect(screen.getByText(PM.adminTokenBudgetTopup.exhaustedTitle)).toBeInTheDocument();
  });

  it('does not render when auditId is missing', () => {
    const { container } = renderBanner({ auditId: undefined });
    expect(container).toBeEmptyDOMElement();
  });

  it('submits a preset top-up and reloads pipeline on success', async () => {
    patchMock.mockResolvedValueOnce(SUCCESS_PAYLOAD);
    const user = userEvent.setup();
    const { onTopupSuccess } = renderBanner({ pipelineState: STATE_LOW });

    const presetButton = screen.getByRole('button', { name: /\+50,?000/ });
    await user.click(presetButton);

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith('audit-1', { delta_tokens: 50_000 });
    });
    expect(onTopupSuccess).toHaveBeenCalledTimes(1);
  });

  it('rejects custom amount above max with validation message', async () => {
    const user = userEvent.setup();
    renderBanner({ pipelineState: STATE_LOW });

    const customInput = screen.getByLabelText(PM.adminTokenBudgetTopup.customAmountLabel);
    await user.type(customInput, '99999999');

    const submit = screen.getByRole('button', { name: PM.adminTokenBudgetTopup.submit });
    await user.click(submit);

    expect(patchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter an amount between/i)).toBeInTheDocument();
  });

  it('rejects custom amount below min with validation message', async () => {
    const user = userEvent.setup();
    renderBanner({ pipelineState: STATE_LOW });

    const customInput = screen.getByLabelText(PM.adminTokenBudgetTopup.customAmountLabel);
    await user.type(customInput, '500');

    const submit = screen.getByRole('button', { name: PM.adminTokenBudgetTopup.submit });
    await user.click(submit);

    expect(patchMock).not.toHaveBeenCalled();
    expect(screen.getByText(/Enter an amount between/i)).toBeInTheDocument();
  });

  it('submits a custom amount with reason', async () => {
    patchMock.mockResolvedValueOnce(SUCCESS_PAYLOAD);
    const user = userEvent.setup();
    renderBanner({ pipelineState: STATE_LOW });

    const customInput = screen.getByLabelText(PM.adminTokenBudgetTopup.customAmountLabel);
    await user.type(customInput, '75000');

    const reasonLabelMatcher = (text: string) => text.startsWith('Reason');
    const reasonInput = screen.getByLabelText(reasonLabelMatcher);
    await user.type(reasonInput, '  emergency rerun  ');

    const submit = screen.getByRole('button', { name: PM.adminTokenBudgetTopup.submit });
    await user.click(submit);

    await waitFor(() => {
      expect(patchMock).toHaveBeenCalledWith('audit-1', {
        delta_tokens: 75_000,
        reason: 'emergency rerun',
      });
    });
  });
});
