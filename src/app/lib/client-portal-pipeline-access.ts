/**
 * Client portal: Pipeline nav + /portal/pipeline are available only after the intake brief
 * satisfies start gates (or the audit has left `created`). Free snapshot stays on the audit page;
 * it is not the multi-phase audit pipeline.
 */

export type AuditMetaForPipelineGate = {
  status: string;
  product_mode: string;
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
  if (!meta?.status || !meta.product_mode) return false;
  if (meta.product_mode === 'free_snapshot') return false;
  if (meta.status !== 'created') return true;
  const g = args.brief?.gates;
  if (!g) return false;
  return g.canStartPipeline === true;
}

/** Short copy for snapshot upgrade — users who skip /portal/audit/new still see definitions here. */
export const CLIENT_PORTAL_PRODUCT_MODE_HELP = {
  starter: {
    label: 'Starter',
    summary: 'Recon plus one selected domain for a focused first pass.',
    detail:
      'Fastest option when you need a single-priority diagnosis first. Strategy phase is disabled.',
  },
  pro: {
    label: 'Pro',
    summary: 'Recon plus 2-3 selected domains with balanced depth.',
    detail:
      'Best fit for teams with several priorities. Strategy can be included based on execution plan.',
  },
  complete: {
    label: 'Complete',
    summary: 'Complete six-domain audit plus final strategy synthesis.',
    detail:
      'Maximum coverage across Tech, Security, SEO, UX, Marketing, and Automation with full comparability.',
  },
} as const;
