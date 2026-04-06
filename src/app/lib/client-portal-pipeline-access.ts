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
  product_mode?: string;
  gates?: {
    canStartExpress?: boolean;
    canStartFull?: boolean;
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
  const pm = args.brief?.product_mode === 'express' ? 'express' : 'full';
  return pm === 'express' ? Boolean(g.canStartExpress) : Boolean(g.canStartFull);
}

/** Short copy for snapshot upgrade — users who skip /portal/audit/new still see definitions here. */
export const CLIENT_PORTAL_PRODUCT_MODE_HELP = {
  express: {
    label: 'Express',
    summary: 'Recon plus four core analysis domains (Tech, Security, SEO, UX through phase 4).',
    detail:
      'Marketing, Automation, and the Strategy roadmap phase are not included. Choose Express when you want focused findings on technical, security, organic, and conversion signals in less time.',
  },
  full: {
    label: 'Full',
    summary: 'The complete eight-phase GLC programme after recon.',
    detail:
      'All six domain analyses (Tech, Security, SEO, UX, Marketing, Automation) plus the Strategy & roadmap phase, with the same review gates as our standard consulting run.',
  },
} as const;
