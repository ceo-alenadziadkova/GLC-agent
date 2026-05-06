import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExecutionLogPanel } from '../ExecutionLogPanel';

const useProfileMock = vi.fn();
const usePipelineMock = vi.fn();
const readNotifyPrefsMock = vi.fn();
const subscribeNotifyPrefsChangedMock = vi.fn();

vi.mock('../../../hooks/useProfile', () => ({
  useProfile: () => useProfileMock(),
}));

vi.mock('../../../hooks/usePipeline', () => ({
  usePipeline: (...args: unknown[]) => usePipelineMock(...args),
}));

vi.mock('../../../pages/settings/services/settings-local-preferences.service', () => ({
  readNotifyPrefs: () => readNotifyPrefsMock(),
  subscribeNotifyPrefsChanged: (...args: unknown[]) => subscribeNotifyPrefsChangedMock(...args),
}));

describe('ExecutionLogPanel', () => {
  it('renders unavailable message when execution trace is hidden for current role', () => {
    useProfileMock.mockReturnValue({ isAdmin: false });
    readNotifyPrefsMock.mockReturnValue({ showExecutionTracePanels: false });
    subscribeNotifyPrefsChangedMock.mockReturnValue(() => undefined);
    usePipelineMock.mockReturnValue({ state: { events: [] }, loading: false, loadMoreEvents: vi.fn() });

    render(
      <ExecutionLogPanel
        auditId="audit-1"
        unavailableMessage="Execution log is available for admin users in notification settings."
      />,
    );

    expect(screen.getByText(/Execution log is available for admin users/i)).toBeInTheDocument();
  });

  it('renders empty state when there are no events', () => {
    useProfileMock.mockReturnValue({ isAdmin: true });
    readNotifyPrefsMock.mockReturnValue({ showExecutionTracePanels: true });
    subscribeNotifyPrefsChangedMock.mockReturnValue(() => undefined);
    usePipelineMock.mockReturnValue({ state: { events: [] }, loading: false, loadMoreEvents: vi.fn() });

    render(<ExecutionLogPanel auditId="audit-1" />);

    expect(screen.getByText('No execution events yet.')).toBeInTheDocument();
  });
});
