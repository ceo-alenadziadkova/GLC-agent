import { ApiError } from '../data/api-error';
import type { QueryClient } from './tanstack-react-query';
import { invalidatePlanWorkspaceQueries } from './plan-workspace-queries';

/** After HTTP 409 on plan-board mutations, force fresh board + orchestration pack reads. */
export async function invalidatePlanBoardQueriesAfterConflict(
  qc: Pick<QueryClient, 'invalidateQueries'>,
  auditId: string,
  err: unknown,
): Promise<void> {
  if (!(err instanceof ApiError) || err.status !== 409) return;
  await invalidatePlanWorkspaceQueries(qc, auditId);
}
