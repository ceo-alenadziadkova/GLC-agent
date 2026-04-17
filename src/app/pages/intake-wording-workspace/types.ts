import type { IntakeBriefCollectionMode, ProductMode } from '../../data/auditTypes';
import type { IntakePlan, IntakeSurface } from '@glc/intake-core';

export type WorkspaceProductOption = { value: ProductMode; label: string };
export type WorkspaceCollectionOption = { value: IntakeBriefCollectionMode | ''; label: string };
export type WorkspaceSurfaceOption = { value: IntakeSurface | ''; label: string };

export type TraceOk = { ok: true; plan: IntakePlan };
export type TraceErr = { ok: false; message: string };
export type TraceResult = TraceOk | TraceErr;

export type PublicationLogEntry = {
  id: string;
  action: 'publish' | 'rollback';
  question_ids: string[];
  created_at: string;
};
