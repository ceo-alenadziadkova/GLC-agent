type StartAuditRow = {
  id: string;
  status: string;
  current_phase: number;
  tokens_used: number;
  token_budget: number;
  updated_at: string;
  user_id: string;
  client_id: string | null;
  product_mode: string;
  execution_plan: Record<string, unknown> | null;
};

type StopAuditRow = {
  id: string;
  status: string;
  current_phase: number;
  updated_at: string;
  user_id: string;
  client_id: string | null;
};

type IntakeBriefRow = {
  responses: Record<string, unknown>;
  collection_mode: string | null;
  intake_versions: Record<string, unknown> | null;
};

const DEFAULT_UPDATED_AT = '2026-01-01T00:00:00.000Z';

export const makePipelineStartAudit = (overrides: Partial<StartAuditRow> = {}): StartAuditRow => ({
  id: 'a1',
  status: 'created',
  current_phase: 0,
  tokens_used: 10,
  token_budget: 100,
  updated_at: DEFAULT_UPDATED_AT,
  user_id: 'u1',
  client_id: null,
  product_mode: 'full',
  execution_plan: null,
  ...overrides,
});

export const makePipelineNextAudit = (overrides: Partial<StartAuditRow> = {}): StartAuditRow => ({
  ...makePipelineStartAudit({
    status: 'review',
  }),
  ...overrides,
});

export const makePipelineRetryAudit = (overrides: Partial<StartAuditRow> = {}): StartAuditRow => ({
  ...makePipelineStartAudit({
    status: 'failed',
    current_phase: 2,
  }),
  ...overrides,
});

export const makePipelineStopAudit = (overrides: Partial<StopAuditRow> = {}): StopAuditRow => ({
  id: 'a1',
  status: 'auto',
  current_phase: 2,
  updated_at: DEFAULT_UPDATED_AT,
  user_id: 'u1',
  client_id: null,
  ...overrides,
});

export const makeIntakeBrief = (overrides: Partial<IntakeBriefRow> = {}): IntakeBriefRow => ({
  responses: {},
  collection_mode: null,
  intake_versions: null,
  ...overrides,
});

export const makePipelineStatusAudit = (overrides: Partial<StartAuditRow> = {}): StartAuditRow => ({
  ...makePipelineNextAudit({
    current_phase: 2,
    execution_plan: { coverage_package: 'full' },
  }),
  ...overrides,
});

export const makeReviewPoint = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  after_phase: 0,
  status: 'approved',
  ...overrides,
});

export const makeQualityGateData = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  passed: true,
  flags: [],
  ...overrides,
});
