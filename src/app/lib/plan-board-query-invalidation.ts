import { planBoardQueryKeys } from '../data/api/plan-board-queries';
import { ApiError } from '../data/api-error';
import type { QueryClient } from './tanstack-react-query';
import { glcKeys } from './glc-keys';

/** After HTTP 409 on plan-board mutations, force fresh board + orchestration pack reads. */
export async function invalidatePlanBoardQueriesAfterConflict(
  qc: Pick<QueryClient, 'invalidateQueries'>,
  auditId: string,
  err: unknown,
): Promise<void> {
  if (!(err instanceof ApiError) || err.status !== 409) return;
  await qc.invalidateQueries({ queryKey: planBoardQueryKeys.audit(auditId) });
  await qc.invalidateQueries({ queryKey: glcKeys.orchestrationPack.detail(auditId) });
}
