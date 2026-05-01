import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '../../lib/tanstack-react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';

import { DirectorDeepDiveDialog } from '../DirectorDeepDiveDialog';
import { DictationProvider } from '../dictation/dictation-context';
import { APP_FEATURE_FLAGS } from '../../config/app-feature-flags';
import { ORCHESTRATION_UI_COPY } from '../../config/orchestration-roadmap-ui-copy.en';
import { ApiError } from '../../data/api-error';

const postDirectorDeepDiveMock = vi.fn();
const getBriefMock = vi.fn();
const getDirectorDeepDiveQuotaMock = vi.fn();
const useDirectorDeepDiveJobMock = vi.fn(() => ({ status: null }));

function renderWithClient(ui: ReactNode, client?: QueryClient) {
  const queryClient =
    client ??
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <DictationProvider>{ui}</DictationProvider>
      </QueryClientProvider>,
    ),
  };
}

vi.mock('../../data/apiService', () => ({
  api: {
    postDirectorDeepDive: (...args: unknown[]) => postDirectorDeepDiveMock(...args),
    getBrief: (...args: unknown[]) => getBriefMock(...args),
    getDirectorDeepDiveQuota: (...args: unknown[]) => getDirectorDeepDiveQuotaMock(...args),
  },
}));

vi.mock('../../hooks/useDirectorDeepDiveJob', () => ({
  useDirectorDeepDiveJob: (...args: unknown[]) => useDirectorDeepDiveJobMock(...args),
}));

describe('DirectorDeepDiveDialog', () => {
  const originalSubAgentsFlag = APP_FEATURE_FLAGS.directorSubAgentsEnabled;

  beforeEach(() => {
    vi.clearAllMocks();
    (APP_FEATURE_FLAGS as { directorSubAgentsEnabled: boolean }).directorSubAgentsEnabled = originalSubAgentsFlag;
    useDirectorDeepDiveJobMock.mockReturnValue({ status: null });
    getBriefMock.mockResolvedValue({ brief: null, questions: [] });
    getDirectorDeepDiveQuotaMock.mockResolvedValue({
      coverage_package: 'starter',
      per_domain_limit: 1,
      used_count: 0,
      remaining: 1,
    });
  });

  it('shows validation error when goals are missing', async () => {
    const user = userEvent.setup();
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.deepDiveStartCta }));
    expect(await screen.findByText(ORCHESTRATION_UI_COPY.deepDiveGoalsRequired)).toBeInTheDocument();
    expect(postDirectorDeepDiveMock).not.toHaveBeenCalled();
  });

  it('prefills goals and constraints from intake brief when available', async () => {
    getBriefMock.mockResolvedValue({
      brief: {
        id: 'b1',
        audit_id: 'audit-1',
        responses: { f1: { value: 'Intake growth goal from brief', source: 'client' } },
        status: 'draft',
        collection_mode: 'self_serve',
        layer_completed: 0,
        collected_by: 'client',
        data_quality_score: 0.5,
        sla_met: true,
        answered_required: 0,
        answered_recommended: 0,
        answered_optional: 0,
        total_required: 0,
        total_recommended: 0,
        total_optional: 0,
        recon_prefills: {},
        recon_conflicts: [],
        post_audit_questions: [],
        progress_pct: 0,
        readiness_badge: 'low',
        next_best_action: 'none',
        responses_format: 2,
        created_at: '',
        updated_at: '',
      },
      questions: [],
    });
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    expect(await screen.findByDisplayValue('Intake growth goal from brief')).toBeInTheDocument();
  });

  it('submits request and displays queued/running metadata', async () => {
    const user = userEvent.setup();
    postDirectorDeepDiveMock.mockResolvedValue({
      job_id: 'job-1',
      status: 'queued',
      estimated_duration_minutes: 4,
    });
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    await user.type(screen.getByLabelText(ORCHESTRATION_UI_COPY.deepDiveGoalsLabel), 'Increase inbound leads');
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.deepDiveStartCta }));
    expect(postDirectorDeepDiveMock).toHaveBeenCalledOnce();
    expect(postDirectorDeepDiveMock.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        operating_mode: undefined,
        sub_agent_ids: undefined,
        client_context: expect.objectContaining({
          goals: ['Increase inbound leads'],
        }),
      }),
    );
    expect(await screen.findByText(new RegExp(`${ORCHESTRATION_UI_COPY.deepDiveJobPrefix}: job-1`))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`${ORCHESTRATION_UI_COPY.deepDiveStatusLabel}: running`))).toBeInTheDocument();
  });

  it('sends selected operating mode in request payload', async () => {
    const user = userEvent.setup();
    postDirectorDeepDiveMock.mockResolvedValue({
      job_id: 'job-2',
      status: 'queued',
      estimated_duration_minutes: 6,
    });
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    await user.type(screen.getByLabelText(ORCHESTRATION_UI_COPY.deepDiveGoalsLabel), 'Increase inbound leads');
    await user.selectOptions(screen.getByLabelText(ORCHESTRATION_UI_COPY.deepDiveModeLabel), 'growth');
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.deepDiveStartCta }));
    expect(postDirectorDeepDiveMock).toHaveBeenCalledOnce();
    expect(postDirectorDeepDiveMock.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        operating_mode: 'growth',
      }),
    );
  });

  it('sends selected sub-agent ids when picker is enabled', async () => {
    const user = userEvent.setup();
    (APP_FEATURE_FLAGS as { directorSubAgentsEnabled: boolean }).directorSubAgentsEnabled = true;
    postDirectorDeepDiveMock.mockResolvedValue({
      job_id: 'job-3',
      status: 'queued',
      estimated_duration_minutes: 6,
    });
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    await user.type(screen.getByLabelText(ORCHESTRATION_UI_COPY.deepDiveGoalsLabel), 'Increase inbound leads');
    await user.click(screen.getByRole('checkbox', { name: /Agent 3 Positioning/i }));
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.deepDiveStartCta }));
    expect(postDirectorDeepDiveMock).toHaveBeenCalledOnce();
    expect(postDirectorDeepDiveMock.mock.calls[0]?.[2]).toEqual(
      expect.objectContaining({
        sub_agent_ids: expect.arrayContaining(['cmo.agent_3_positioning']),
      }),
    );
  });

  it('maps quota error codes to user copy', async () => {
    const user = userEvent.setup();
    postDirectorDeepDiveMock.mockRejectedValue(
      new ApiError('quota', 409, 'DIRECTOR_DEEP_DIVE_QUOTA_EXCEEDED'),
    );
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    await user.type(screen.getByLabelText(ORCHESTRATION_UI_COPY.deepDiveGoalsLabel), 'Increase inbound leads');
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.deepDiveStartCta }));
    expect(await screen.findByText(ORCHESTRATION_UI_COPY.deepDiveErrorQuotaExceeded)).toBeInTheDocument();
  });

  it('maps token budget error codes to user copy', async () => {
    const user = userEvent.setup();
    postDirectorDeepDiveMock.mockRejectedValue(
      new ApiError('token cap', 409, 'DIRECTOR_DEEP_DIVE_TOKEN_BUDGET_EXCEEDED'),
    );
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    await user.type(screen.getByLabelText(ORCHESTRATION_UI_COPY.deepDiveGoalsLabel), 'Increase inbound leads');
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.deepDiveStartCta }));
    expect(await screen.findByText(ORCHESTRATION_UI_COPY.deepDiveErrorTokenBudgetExceeded)).toBeInTheDocument();
  });

  it('maps idempotency mismatch error code to user copy', async () => {
    const user = userEvent.setup();
    postDirectorDeepDiveMock.mockRejectedValue(
      new ApiError('mismatch', 409, 'IDEMPOTENCY_PAYLOAD_MISMATCH'),
    );
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    await user.type(screen.getByLabelText(ORCHESTRATION_UI_COPY.deepDiveGoalsLabel), 'Increase inbound leads');
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.deepDiveStartCta }));
    expect(await screen.findByText(ORCHESTRATION_UI_COPY.deepDiveErrorIdempotencyMismatch)).toBeInTheDocument();
  });

  it('renders QA block when realtime status completes with summary payload', async () => {
    useDirectorDeepDiveJobMock.mockReturnValue({
      status: 'completed',
      qaBlock: {
        coherence: 'Aligned',
        feasibility: 'Feasible',
        top_3_actions: ['A1', 'A2', 'A3'],
        risks: ['R1'],
        measurement: ['M1'],
      },
    });
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    expect(screen.getByText(ORCHESTRATION_UI_COPY.deepDiveQaBlockTitle)).toBeInTheDocument();
    expect(screen.getByText(/Aligned/)).toBeInTheDocument();
  });

  it('promotes status from running to completed when realtime updates', async () => {
    const user = userEvent.setup();
    postDirectorDeepDiveMock.mockResolvedValue({
      job_id: 'job-4',
      status: 'queued',
      estimated_duration_minutes: 5,
    });
    const realtimeState: {
      status: 'running' | 'completed' | null;
      qaBlock?: {
        coherence: string;
        feasibility: string;
        top_3_actions: string[];
        risks: string[];
        measurement: string[];
      };
    } = { status: 'running' };
    useDirectorDeepDiveJobMock.mockImplementation(() => ({
      status: realtimeState.status,
      qaBlock: realtimeState.qaBlock,
    }));
    const { rerender, queryClient } = renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    await user.type(screen.getByLabelText(ORCHESTRATION_UI_COPY.deepDiveGoalsLabel), 'Increase inbound leads');
    await user.click(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.deepDiveStartCta }));
    expect(await screen.findByText(new RegExp(`${ORCHESTRATION_UI_COPY.deepDiveStatusLabel}: running`))).toBeInTheDocument();
    realtimeState.status = 'completed';
    realtimeState.qaBlock = {
      coherence: 'Aligned',
      feasibility: 'Feasible',
      top_3_actions: ['A1', 'A2', 'A3'],
      risks: ['R1'],
      measurement: ['M1'],
    };
    rerender(
      <QueryClientProvider client={queryClient}>
        <DictationProvider>
          <DirectorDeepDiveDialog
            open
            onOpenChange={() => undefined}
            auditId="audit-1"
            domainKey="marketing_utp"
          />
        </DictationProvider>
      </QueryClientProvider>,
    );
    expect(await screen.findByText(new RegExp(`${ORCHESTRATION_UI_COPY.deepDiveStatusLabel}: completed`))).toBeInTheDocument();
    expect(screen.getByText(ORCHESTRATION_UI_COPY.deepDiveQaBlockTitle)).toBeInTheDocument();
  });

  it('disables start and shows exhausted hint when quota remaining is 0', async () => {
    getDirectorDeepDiveQuotaMock.mockResolvedValue({
      coverage_package: 'pro',
      per_domain_limit: 2,
      used_count: 2,
      remaining: 0,
    });
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    expect(await screen.findByText(ORCHESTRATION_UI_COPY.deepDiveQuotaExhaustedHint)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: ORCHESTRATION_UI_COPY.deepDiveStartCta })).toBeDisabled();
  });

  it('shows package badge from quota response', async () => {
    getDirectorDeepDiveQuotaMock.mockResolvedValue({
      coverage_package: 'complete',
      per_domain_limit: 3,
      used_count: 0,
      remaining: 3,
    });
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    expect(
      await screen.findByText(
        new RegExp(
          `${ORCHESTRATION_UI_COPY.deepDivePackageBadgePrefix}\\s*${ORCHESTRATION_UI_COPY.deepDivePackageLabel_complete}`,
        ),
      ),
    ).toBeInTheDocument();
  });

  /** Mobile/narrow layout: quota row uses responsive flex so badges stack on small viewports. */
  it('uses responsive quota badge layout (sm: breakpoint) for phone-sized surfaces', async () => {
    getDirectorDeepDiveQuotaMock.mockResolvedValue({
      coverage_package: 'starter',
      per_domain_limit: 1,
      used_count: 0,
      remaining: 1,
    });
    renderWithClient(
      <DirectorDeepDiveDialog
        open
        onOpenChange={() => undefined}
        auditId="audit-1"
        domainKey="marketing_utp"
      />,
    );
    expect(await screen.findByText(/0\s*\/\s*1/)).toBeInTheDocument();
    expect(document.body.innerHTML).toContain('sm:flex-row');
  });
});
