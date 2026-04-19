/**
 * Client view of persisted `glc_orchestration_pack` (server-validated JSON).
 * Keep fields aligned with `server/src/schemas/glc-orchestration-pack.ts`.
 */

export interface GlcOrchestrationPackView {
  version: number;
  graph: {
    nodes: Array<{
      id: string;
      title: string;
      domain: string;
      lane: string;
    }>;
    edges: Array<{ from: string; to: string; weight?: number }>;
    meta?: unknown;
  };
  lanes: Record<string, string[]>;
  critical_path: string[];
  conflicts_resolved: Array<{
    id: string;
    summary: string;
    resolution: string;
  }>;
  manifest_snapshot_id: string;
}
