import {
  benchmarksApi,
  auditRequestsApi,
  auditsCrudApi,
  auditsPipelineApi,
  auditsReviewsReportsApi,
  briefProfilePlatformApi,
  dashboardNotificationsApi,
  discoverApi,
  briefPublicApi,
  intakeTokensApi,
  marketingSnapshotIncidentsApi,
  snapshotCompareApi,
  type GlcApi,
} from './api';

export * from './api-dashboard-types';
export { ApiError } from './api-error';
export { snapshotPublicRequest } from './api-http';

export type { GlcApi } from './api';

// ─── API Service (composed from domain modules in ./api/) ───────────────────

export const api = {
  ...benchmarksApi,
  ...auditsCrudApi,
  ...auditsPipelineApi,
  ...auditsReviewsReportsApi,
  ...briefProfilePlatformApi,
  ...auditRequestsApi,
  ...dashboardNotificationsApi,
  ...briefPublicApi,
  ...intakeTokensApi,
  ...discoverApi,
  ...marketingSnapshotIncidentsApi,
  ...snapshotCompareApi,
} satisfies GlcApi;
