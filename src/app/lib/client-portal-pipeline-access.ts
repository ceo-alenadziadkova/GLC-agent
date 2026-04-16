import type { AuditCoveragePackage, DomainKey } from '../data/auditTypes';
import { isSnapshotStyleAudit } from './audit-execution-plan';
import { CLIENT_AUDIT_VIEW_COPY } from '../config/client-audit-view-copy';

/**
 * Client portal: Pipeline nav + /portal/pipeline are available only after the intake brief
 * satisfies start gates (or the audit has left `created`). Free snapshot stays on the audit page;
 * it is not the multi-phase audit pipeline.
 */

export type AuditMetaForPipelineGate = {
  status: string;
  snapshot_token?: string | null;
  execution_plan?: {
    selected_domains?: DomainKey[];
    coverage_package?: AuditCoveragePackage;
    include_strategy?: boolean;
  } | null;
};

export type BriefGatesPayload = {
  gates?: {
    canStartPipeline?: boolean;
  } | null;
};

export function clientCanViewPortalPipeline(args: {
  auditMeta: AuditMetaForPipelineGate | null | undefined;
  brief: BriefGatesPayload | null | undefined;
}): boolean {
  const meta = args.auditMeta;
  if (!meta?.status) return false;
  if (isSnapshotStyleAudit(meta)) return false;
  if (meta.status !== 'created') return true;
  const g = args.brief?.gates;
  if (!g) return false;
  return g.canStartPipeline === true;
}

/** Short copy for snapshot upgrade — users who skip /portal/audit/new still see definitions here. */
export const CLIENT_PORTAL_PRODUCT_MODE_HELP = CLIENT_AUDIT_VIEW_COPY.productModeHelp;
