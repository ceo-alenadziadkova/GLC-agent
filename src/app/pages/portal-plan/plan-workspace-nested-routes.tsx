import type { RouteObject } from 'react-router';
import { PLAN_WORKSPACE_SURFACE_SEGMENTS as S } from '@glc/intake-core';

import { PlanWorkspaceIndexRedirect } from './PlanWorkspaceIndexRedirect';
import { PlanStudioToLabRedirect } from './PlanStudioToLabRedirect';
import {
  PlanDeliveryBoardPage,
  PlanDeliveryRoadmapPage,
  PlanDeliveryTablePage,
  PlanStudioWorkspacePage,
} from './PlanWorkspaceSurfaces';

/** Nested routes under `plan/:id` and `portal/plan/:id` (shared with Vitest memory routers). */
export const PLAN_WORKSPACE_NESTED_ROUTE_OBJECTS: RouteObject[] = [
  { index: true, element: <PlanWorkspaceIndexRedirect /> },
  { path: S.board, element: <PlanDeliveryBoardPage /> },
  { path: S.roadmap, element: <PlanDeliveryRoadmapPage /> },
  { path: S.table, element: <PlanDeliveryTablePage /> },
  { path: S.studio, element: <PlanStudioToLabRedirect /> },
];

/** Nested index-only routes under `/lab/:id` and `/portal/lab/:id` (Strategy Lab studio). */
export const LAB_WORKSPACE_NESTED_ROUTE_OBJECTS: RouteObject[] = [
  { index: true, element: <PlanStudioWorkspacePage /> },
];
