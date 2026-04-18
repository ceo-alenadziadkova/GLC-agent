import type { Edge, Node } from '@xyflow/react';
import type { LayoutRulesV1 } from '@glc/intake-core';
import type { StudioPolicyMode } from '../question-bank-studio-policy';
import type { StudioPolicyBaseVisualKind } from '../question-bank-studio-node-style';

export type StudioLayoutSurfaceKey = keyof LayoutRulesV1['surfaces'];

export type StudioGraphStats = {
  questionCount: number;
  sectionCount: number;
  branchEdgeCount: number;
  structureEdgeCount: number;
  branchMaxDepth: number;
  branchRootCount: number;
  branchLeafCount: number;
  /** Longest root-to-question path along structure edges (schema + optional layout steps). */
  structureMaxDepth: number;
  /** Question nodes in the current structure view (respects section collapse). */
  structureLeafCount: number;
};

export type StudioQuestionNodeData = {
  kind: 'question';
  questionId: string;
  shortLabel: string;
  fullLabel: string;
  sectionKey: string;
  priority: string;
  branchCondition?: string;
  participatesPolicy: boolean;
  policyBadges: string[];
  /** UI: lower opacity when true and participatesPolicy is false */
  applyPolicyDim: boolean;
  /** Policy + canon priority chrome (card left stripe). */
  policyBaseVisual: StudioPolicyBaseVisualKind;
  /** Dagre / canvas box (matches viewDensity). */
  layoutSize: { w: number; h: number };
  /** Domains that consume this id (QUESTION_BANK §5). */
  feedDomains: string[];
  /** Left border accent when color-by-domain is on (hex). */
  domainAccent?: string;
};

export type StudioSectionNodeData = {
  kind: 'section';
  sectionKey: string;
  label: string;
  questionCount: number;
  /** Questions hidden on canvas (collapsed branch). */
  collapsed: boolean;
};

/** Wizard step from `layout-rules` (presentation only; canon remains section-scoped). */
export type StudioLayoutStepNodeData = {
  kind: 'layoutStep';
  surfaceKey: StudioLayoutSurfaceKey;
  sectionKey: string;
  stepIndex: number;
  label: string;
  questionCount: number;
};

/** Primary agent/domain slice cluster (question-feed-roles `primary[0]`). */
export type StudioDomainClusterNodeData = {
  kind: 'domainCluster';
  domainKey: string;
  label: string;
  questionCount: number;
};

export type StudioRootNodeData = {
  kind: 'root';
  label: string;
};

export type StudioIdentityNodeData = {
  kind: 'identity';
  questionId: string;
  shortLabel: string;
  participatesPolicy: boolean;
};

export type StudioAnyNodeData =
  | StudioQuestionNodeData
  | StudioSectionNodeData
  | StudioLayoutStepNodeData
  | StudioDomainClusterNodeData
  | StudioRootNodeData
  | StudioIdentityNodeData;

export type BuildStudioGraphInput = {
  policyMode: StudioPolicyMode;
  showBranchEdges: boolean;
  /** Dagre orientation: top-bottom (default) or left-right. */
  orientation?: 'TB' | 'LR';
  /** Section letters/keys with collapsed question subtrees (section node stays visible). */
  collapsedSectionKeys?: ReadonlySet<string>;
  /** Tint question nodes by primary feed domain. */
  colorByDomain?: boolean;
  /**
   * When set, inserts `layout-rules` wizard steps between section and question nodes for that surface.
   * Unmapped bank ids stay linked directly from the section.
   */
  layoutSurface?: StudioLayoutSurfaceKey | null;
  /**
   * Inserts primary feed-domain clusters from `question-feed-roles.ts` between root and sections.
   */
  clusterByPrimaryDomain?: boolean;
  /** Question card size + layout spacing (dagre node box). */
  viewDensity?: 'comfortable' | 'compact';
};

export type BuildStudioGraphResult = {
  nodes: Node<StudioAnyNodeData>[];
  edges: Edge[];
  stats: StudioGraphStats;
  /** Section keys in first-seen order (for collapse UI). */
  sectionKeys: string[];
};
