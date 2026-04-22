import surfaceMatrix from '../artifacts/surface-matrix-pilot.v1.json' with { type: 'json' };
import type { IntakeBriefCollectionMode } from '../audit-contract.js';
import type { IntakeSurface } from './types.js';

export type SurfaceMatrixPilotSurfaceKey = keyof SurfaceMatrixPilotV1['surfaces'];
export type SurfaceMatrixEnforcementPoint = 'brief_recompute' | 'conversion' | 'pipeline_start';

export interface SurfaceMatrixPilotV1 {
  version: string;
  surfaces: Record<
    string,
    {
      remediationMax: number;
      enforceAuditReadyOn: string[];
      enforceFlowReadyOn: string[];
      consultantOverrideAllowed?: boolean;
    }
  >;
}

const MATRIX = surfaceMatrix as SurfaceMatrixPilotV1;

export function loadSurfaceMatrixPilot(): SurfaceMatrixPilotV1 {
  return MATRIX;
}

function normalizeCollectionMode(mode: IntakeBriefCollectionMode | undefined): IntakeBriefCollectionMode {
  return mode ?? 'self_serve';
}

function resolveSurfaceMatrixKey(args: {
  collectionMode?: IntakeBriefCollectionMode;
  surface?: IntakeSurface;
}): SurfaceMatrixPilotSurfaceKey {
  const mode = normalizeCollectionMode(args.collectionMode);
  if (mode === 'pre_brief') return 'pre_brief_client_form';
  if (mode === 'discovery' || args.surface === 'public_discovery') return 'discovery_public_discovery';
  if (args.surface === 'consultant_interview' || mode === 'interview') return 'consultant_interview';
  return 'self_serve_client_form';
}

export function resolveSurfaceMatrixPilotPolicy(args: {
  collectionMode?: IntakeBriefCollectionMode;
  surface?: IntakeSurface;
}): SurfaceMatrixPilotV1['surfaces'][string] {
  const key = resolveSurfaceMatrixKey(args);
  const policy = MATRIX.surfaces[key];
  if (policy) return policy;
  return MATRIX.surfaces.self_serve_client_form;
}

export function isSurfaceReadinessEnforcedAt(args: {
  collectionMode?: IntakeBriefCollectionMode;
  surface?: IntakeSurface;
  point: SurfaceMatrixEnforcementPoint;
  kind: 'flow' | 'audit';
}): boolean {
  const policy = resolveSurfaceMatrixPilotPolicy(args);
  const points = args.kind === 'flow' ? policy.enforceFlowReadyOn : policy.enforceAuditReadyOn;
  return points.includes(args.point);
}
