import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '../../../lib/tanstack-react-query';

import { STRATEGY_LAB_COPY } from '../../../config/strategy-lab-copy';
import { StrategyLab } from '../StrategyLabPage';

const reloadMock = vi.fn();
const useAuditMock = vi.fn();
const useProfileMock = vi.fn(() => ({ isClient: false }));
const onlineState = vi.hoisted(() => ({ value: true }));

vi.mock('../../../hooks/useBrowserOnline', () => ({
  useBrowserOnline: () => onlineState.value,
}));

vi.mock('../../../hooks/useAudit', () => ({
  useAudit: (...args: unknown[]) => useAuditMock(...args),
}));

vi.mock('../../../hooks/useProfile', () => ({
  useProfile: () => useProfileMock(),
}));

vi.mock('../../../hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn(() => false),
}));

vi.mock('../../../components/AppShell', () => ({
  AppShell: ({ children }: { children: ReactNode }) => <div data-testid="app-shell">{children}</div>,
}));

function renderLab() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/strategy/audit-load-error-fixture']}>
        <Routes>
          <Route path="strategy/:id" element={<StrategyLab />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('StrategyLabPage load failure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    onlineState.value = true;
    useAuditMock.mockReturnValue({
      audit: null,
      loading: false,
      error: 'Failed to load audit',
      reload: reloadMock,
      isFetching: false,
    });
  });

  it('shows persistent retry Control with error message and invokes reload when online', async () => {
    const user = userEvent.setup();
    renderLab();

    expect(screen.getByRole('alert')).toBeTruthy();
    expect(screen.getByText('Failed to load audit')).toBeTruthy();

    const retry = screen.getByRole('button', { name: STRATEGY_LAB_COPY.messages.retryLoad });
    expect(retry).not.toBeDisabled();

    await user.click(retry);
    expect(reloadMock).toHaveBeenCalledTimes(1);

    expect(screen.queryByText(STRATEGY_LAB_COPY.messages.offlineHint)).not.toBeInTheDocument();
  });

  it('disables retry when offline and surfaces offline hint', () => {
    onlineState.value = false;
    renderLab();

    const retry = screen.getByRole('button', { name: STRATEGY_LAB_COPY.messages.retryLoad });
    expect(retry).toBeDisabled();
    expect(screen.getByText(STRATEGY_LAB_COPY.messages.offlineHint)).toBeTruthy();
  });

  it('sets aria-busy on retry while refetch runs', () => {
    useAuditMock.mockReturnValue({
      audit: null,
      loading: false,
      error: 'Failed',
      reload: reloadMock,
      isFetching: true,
    });
    renderLab();

    expect(screen.getByRole('button', { name: STRATEGY_LAB_COPY.messages.retryLoad })).toHaveAttribute(
      'aria-busy',
      'true',
    );
  });
});
