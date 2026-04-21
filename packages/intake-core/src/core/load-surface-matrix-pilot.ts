import surfaceMatrix from '../artifacts/surface-matrix-pilot.v1.json' with { type: 'json' };

export type SurfaceMatrixPilotSurfaceKey = keyof SurfaceMatrixPilotV1['surfaces'];

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
