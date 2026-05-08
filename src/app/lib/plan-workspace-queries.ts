import type { QueryClient } from './tanstack-react-query';
import { glcKeys } from './glc-keys';

/**
 * Invalidates all TanStack Query roots used by unified Plan workspace (audit row, pack, delivery board).
 * Single call-site for compile mutations, board conflicts, and cockpit refresh.
 */
export function invalidatePlanWorkspaceQueries(
  qc: Pick<QueryClient, 'invalidateQueries'>,
  auditId: string,
): Promise<unknown[]> {
  return Promise.all([
    qc.invalidateQueries({ queryKey: glcKeys.planWorkspace.detail(auditId) }),
    qc.invalidateQueries({ queryKey: glcKeys.audit.detail(auditId) }),
    qc.invalidateQueries({ queryKey: glcKeys.orchestrationPack.detail(auditId) }),
    qc.invalidateQueries({ queryKey: glcKeys.timeline.detail(auditId) }),
    qc.invalidateQueries({ queryKey: glcKeys.planWorkspace.board(auditId) }),
  ]);
}
