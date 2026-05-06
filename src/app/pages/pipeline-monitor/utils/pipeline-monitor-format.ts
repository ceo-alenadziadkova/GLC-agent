import { APP_ROUTE_SEGMENTS } from '@glc/intake-core';
import { formatAuditWebsiteDisplay } from '../../../data/no-public-website';
import { PIPELINE_MONITOR_COPY as PM } from '../../../config/pipeline-monitor-copy';
import { STRATEGY_PHASE_ID } from '../phase-meta';

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
  return isClient ? `/${APP_ROUTE_SEGMENTS.portalAuditById.replace(':id', id)}` : `/audit/${id}`;
}

/** Strategy phase output is shown in Strategy Lab; domain phases use audit workspace. */
export function buildStrategyLabPath(auditId: string | undefined): string {
  if (!auditId) return '/';
  return `/${APP_ROUTE_SEGMENTS.strategyById.replace(':id', auditId)}`;
}

export function buildPortalStrategyLabPath(auditId: string | undefined): string {
  if (!auditId) return '/';
  return `/${APP_ROUTE_SEGMENTS.portalStrategyById.replace(':id', auditId)}`;
}

export function buildPortalReportPath(auditId: string | undefined): string {
  if (!auditId) return '/';
  return `/${APP_ROUTE_SEGMENTS.portalReportsById.replace(':id', auditId)}`;
}

export function getPhaseResultViewPath(args: {
  phaseId: number;
  auditId: string | undefined;
  isClient: boolean;
  auditStatus: string;
}): string {
  const { phaseId, auditId, isClient, auditStatus } = args;
  if (phaseId === STRATEGY_PHASE_ID) {
    if (isClient) return buildPortalStrategyLabPath(auditId);
    return buildStrategyLabPath(auditId);
  }
  if (isClient && auditStatus === 'completed') {
    return buildPortalReportPath(auditId);
  }
  return getWorkspacePath(auditId, isClient);
}
