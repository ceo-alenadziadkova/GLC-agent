import type { FreeSnapshotPreview } from '../../../data/auditTypes';
import type { ProgramRecommendation, SnapshotIssue, SnapshotQuickWin } from '../config/portal-snapshot-account-mirror.constants';

export type SnapshotMirrorAccessState = ReturnType<
  typeof import('../../../lib/snapshot-diagnostics').getSnapshotAccessBlockedState
>;

export type SnapshotScoreVisualModel =
  | { mode: 'overall'; overallScore: number }
  | { mode: 'legacy'; band: number; uxLabel: string | null };

export interface PortalSnapshotMirrorViewModel {
  result: FreeSnapshotPreview;
  access: SnapshotMirrorAccessState;
  calloutLimitations: string[];
  coverageLine: string | null;
  hostname: string;
  siteLine: string | null;
  classificationExplainer: string | null;
  showSnapshotScoreBlock: boolean;
  hasSummary: boolean;
  scoreVisual: SnapshotScoreVisualModel;
  issues: SnapshotIssue[];
  quickWins: SnapshotQuickWin[];
  programRecommendations: ProgramRecommendation[];
  signalsFound: string[];
  techChips: string[];
}
