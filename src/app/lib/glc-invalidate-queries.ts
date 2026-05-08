import type { QueryClient } from './tanstack-react-query';
import { glcKeys } from './glc-keys';
import { invalidatePlanWorkspaceQueries } from './plan-workspace-queries';

export function invalidateAuditRelatedQueries(qc: QueryClient, auditId: string): void {
  void invalidatePlanWorkspaceQueries(qc, auditId);
  void qc.invalidateQueries({ queryKey: glcKeys.audit.detail(auditId) });
  void qc.invalidateQueries({ queryKey: glcKeys.brief.detail(auditId) });
}

export function invalidateAuditsListsAndDashboard(qc: QueryClient): void {
  void qc.invalidateQueries({ queryKey: glcKeys.audits.listsPrefix });
  void qc.invalidateQueries({ queryKey: glcKeys.dashboard() });
}
