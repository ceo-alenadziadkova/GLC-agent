import type { IntakePlan } from '@glc/intake-core';

export type NodeStatus = 'required' | 'visible' | 'deferred' | 'hidden' | 'other';
export type WordingSeverity = 'high' | 'medium';
export type WordingScoringMode = 'strict' | 'normal' | 'lenient';

export interface NodePos {
  id: string;
  x: number;
  y: number;
  layer: number;
}

export interface Edge {
  from: string;
  to: string;
}

export interface GraphModel {
  edges: Edge[];
  layers: string[][];
  upstreamById: Map<string, string[]>;
  downstreamById: Map<string, string[]>;
}

export interface GraphLayout {
  positions: Map<string, NodePos>;
  width: number;
  height: number;
}

export interface SelectedReason {
  id: string;
  status: NodeStatus;
  reasons: Array<{ layer: string; state: string; code: string; detail?: string }>;
}

export interface WordingReviewItem {
  id: string;
  severity: WordingSeverity;
  reasons: string[];
  score: number;
}

export interface GraphPreferencesState {
  pathOnlyMode: boolean;
  downstreamDepth: number;
  searchQuery: string;
  showBeforeAfter: boolean;
  baReviewMode: boolean;
  highOnly: boolean;
  scoringMode: WordingScoringMode;
}

export interface IntakeTraceEdgeGraphProps {
  plan: IntakePlan;
  resolveLabel: (id: string) => string;
  resolveCanonLabel: (id: string) => string;
  resolveDraftLabel: (id: string) => string | null;
  resolvePublishedLabel?: (id: string) => string | null;
  focusId: string;
  onFocusIdChange: (id: string) => void;
  showWordingReview?: boolean;
}

