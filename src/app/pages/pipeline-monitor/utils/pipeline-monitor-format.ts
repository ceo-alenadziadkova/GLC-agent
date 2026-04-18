import { formatAuditWebsiteDisplay } from '../../../data/no-public-website';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';

type AuditMetaLite = {
  company_name?: string | null;
  company_url?: string | null;
  no_public_website?: boolean | null;
};

type AuditLite = {
  meta: AuditMetaLite;
} | null;

export function getPipelineMonitorCompanyName(audit: AuditLite): string {
  return (
    audit?.meta.company_name ||
    formatAuditWebsiteDisplay(audit?.meta.company_url, audit?.meta.no_public_website) ||
    audit?.meta.company_url ||
    PM.loadingCompany
  );
}

export function getWorkspacePath(id: string | undefined, isClient: boolean): string {
  if (!id) return '/';
  return isClient ? `/portal/audit/${id}` : `/audit/${id}`;
}
