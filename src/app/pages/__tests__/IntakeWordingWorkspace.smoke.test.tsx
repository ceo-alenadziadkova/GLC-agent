import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { IntakeWordingWorkspace } from '../IntakeWordingWorkspace';
import { INTAKE_WORDING_WORKSPACE_COPY as W } from '../../config/intake-wording-workspace-copy';
import { useIntakeWordingDrafts } from '../../hooks/useIntakeWordingDrafts';
import { INTAKE_TRACE_SCENARIO_PRESETS } from '../../lib/intake-trace-scenarios';

vi.mock('../../hooks/useIntakeWordingDrafts', () => ({
  useIntakeWordingDrafts: vi.fn(),
}));

vi.mock('../intake-wording-workspace/services', () => ({
  fetchPublicationLog: vi.fn(async () => []),
  emitWorkspaceOpened: vi.fn(),
  emitWorkspaceClosed: vi.fn(),
  emitDraftSaved: vi.fn(),
  emitPublished: vi.fn(),
  emitRollback: vi.fn(),
}));

vi.mock('../../components/AppShell', () => ({
  AppShell: ({ children, title, subtitle }: { children: ReactNode; title: string; subtitle: string }) => (
    <div>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      {children}
    </div>
  ),
}));

const mockedUseIntakeWordingDrafts = vi.mocked(useIntakeWordingDrafts);

describe('IntakeWordingWorkspace smoke', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedUseIntakeWordingDrafts.mockReturnValue({
      drafts: {},
      published: {},
      setDrafts: vi.fn(),
      hydrated: false,
      syncToServer: vi.fn(async () => ({ ok: true })),
      publishWording: vi.fn(async () => ({ applied_to: [] })),
      rollbackWording: vi.fn(async () => ({ applied_to: [], drafts: {} })),
    });
  });

  it('renders workspace shell and trace controls', () => {
    render(<IntakeWordingWorkspace />);
    expect(screen.getByText(W.appShell.title)).toBeInTheDocument();
    expect(screen.getByText(W.appShell.subtitle)).toBeInTheDocument();
    expect(screen.getByText(W.fields.productMode)).toBeInTheDocument();
    expect(screen.getByText(W.fields.responsesJson)).toBeInTheDocument();
  });

  it('supports scenario preset and import dialog interactions', async () => {
    const user = userEvent.setup();
    render(<IntakeWordingWorkspace />);

    const scenarioSummary = screen.getByText(W.scenarioPresets.summaryLabel);
    await user.click(scenarioSummary);
    await user.click(screen.getByRole('button', { name: INTAKE_TRACE_SCENARIO_PRESETS[0].label }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: W.actions.importJson })).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: W.actions.importJson }));
    expect(await screen.findByText(W.dialogs.importTitle)).toBeInTheDocument();
  });
});
