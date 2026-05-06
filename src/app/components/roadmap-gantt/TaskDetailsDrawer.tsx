import dayjs from 'dayjs';
import { Link } from 'react-router';
import { CaretDownIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';

import {
  ORCHESTRATION_UI_COPY,
  formatRoadmapGanttUnlocksCopy,
} from '../../config/orchestration-roadmap-ui-copy.en';
import {
  PLAN_BOARD_COLUMN_HEADINGS_EN,
  PLAN_BOARD_UI_COLUMNS,
  isPlanBoardUiColumnId,
  type PlanBoardUiColumnId,
} from '../../config/plan-board-ui-columns';
import { PLAN_BOARD_COPY } from '../../config/plan-board-copy.en';
import { isPlanBoardDrawerMoveAllowed } from '../../config/plan-board-transitions';
import type { PlanBoardCardDto } from '../../data/api/audits-orchestration';
import { usePatchPlanBoardCardMutation } from '../../data/api/plan-board-queries';
import type { RoadmapGanttDependency, RoadmapGanttLaneId, RoadmapGanttTask } from '../../lib/roadmap-gantt-mapper';
import { ROADMAP_GANTT_MILESTONE_LANE_ID } from '../../lib/roadmap-gantt-mapper';
import { Button } from '../ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer';

/** Delivery Board move affordance from Roadmap drawer (ADR cross-view mutation surface §5). */
export type TaskDetailsPlanBoardMove =
  | { status: 'off' }
  | { status: 'loading' }
  | { status: 'no_row' }
  | { status: 'blocked_no_pack' }
  | { status: 'blocked_governance' }
  | { status: 'query_failed' }
  | { status: 'ready'; row: PlanBoardCardDto; packVersion: number; role: 'consultant' | 'client' };

type TaskDetailsDrawerProps = {
  auditId?: string | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: RoadmapGanttTask | null;
  dependencies: RoadmapGanttDependency[];
  taskTitleById: Map<string, string>;
  downstreamTaskCount: number;
  onFilterToLane?: (laneId: RoadmapGanttLaneId) => void;
  /** Deep-link to Plan Board with `focus` on the pack graph node id (ADR cross-view contract). */
  deliveryBoardHref?: string | null;
  planBoardMove?: TaskDetailsPlanBoardMove | undefined;
};

export function TaskDetailsDrawer({
  auditId,
  open,
  onOpenChange,
  task,
  dependencies,
  taskTitleById,
  downstreamTaskCount,
  onFilterToLane,
  deliveryBoardHref,
  planBoardMove,
}: TaskDetailsDrawerProps) {
  const pb = planBoardMove ?? { status: 'off' as const };
  const patchMutation = usePatchPlanBoardCardMutation({ auditId: auditId ?? undefined });

  const incomingDependencies = task ? dependencies.filter((dep) => dep.to === task.id) : [];
  const isBlocked = incomingDependencies.some((dep) => dep.blocking);

  let currentDeliveryColumnLabel: PlanBoardUiColumnId | null = null;
  if (pb.status === 'ready') {
    const cid = pb.row.column_id;
    currentDeliveryColumnLabel = isPlanBoardUiColumnId(cid) ? cid : null;
  }

  async function submitMove(colId: PlanBoardUiColumnId) {
    if (pb.status !== 'ready' || !auditId || currentDeliveryColumnLabel == null) return;
    if (!isPlanBoardDrawerMoveAllowed(pb.role, currentDeliveryColumnLabel, colId)) return;

    try {
      await patchMutation.mutateAsync({
        cardId: pb.row.id,
        body: { to_column: colId, expected_pack_version: pb.packVersion },
      });
      toast.success(PLAN_BOARD_COPY.roadmapDrawerMoveSuccessToast);
    } catch {
      toast.error(PLAN_BOARD_COPY.roadmapDrawerMoveErrorToast);
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="right">
      <DrawerContent className="max-w-xl">
        <DrawerHeader>
          <DrawerTitle>{task?.title ?? 'Task details'}</DrawerTitle>
          <DrawerDescription>
            {task?.description || 'No detailed description available yet for this task.'}
          </DrawerDescription>
        </DrawerHeader>
        {task ? (
          <div className="space-y-4 px-4 pb-4 text-sm">
            <div className="flex flex-wrap gap-2">
              {task.onCriticalPath ? (
                <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium ds-text-secondary">
                  {ORCHESTRATION_UI_COPY.roadmapGanttCriticalPathBadge}
                </span>
              ) : null}
              {task.isOverdue ? (
                <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium ds-text-score-1">
                  {ORCHESTRATION_UI_COPY.roadmapGanttOverdueBadge}
                </span>
              ) : null}
              {task.topPriorityBucket === '7d' ? (
                <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium ds-text-secondary">
                  {ORCHESTRATION_UI_COPY.roadmapGanttTopPriority7dBadge}
                </span>
              ) : null}
              {task.topPriorityBucket === '30d' ? (
                <span className="rounded-full border border-[var(--border-default)] bg-[var(--surface-raised)] px-2 py-0.5 text-xs font-medium ds-text-secondary">
                  {ORCHESTRATION_UI_COPY.roadmapGanttTopPriority30dBadge}
                </span>
              ) : null}
            </div>
            {task.isOverdue ? (
              <p className="text-xs ds-text-tertiary">
                {ORCHESTRATION_UI_COPY.roadmapGanttOverdueEndedPrefix} {dayjs(task.end_time).format('YYYY-MM-DD')}.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2 rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] p-3">
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Summary</div>
                <div className="mt-1 text-[var(--text-primary)]">
                  {isBlocked ? 'Blocked task' : 'Ready to execute'}
                </div>
              </div>
              <div>
                <div className="text-xs font-medium uppercase tracking-wide text-[var(--text-tertiary)]">Next action</div>
                <div className="mt-1 text-[var(--text-primary)]">
                  {isBlocked ? 'Unblock upstream dependency' : 'Move to next milestone'}
                </div>
              </div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">{ORCHESTRATION_UI_COPY.roadmapGanttUnlocksLabel}</div>
              <div className="mt-1 text-[var(--text-secondary)]">{formatRoadmapGanttUnlocksCopy(downstreamTaskCount)}</div>
            </div>
            {task.kind === 'task' && task.group !== ROADMAP_GANTT_MILESTONE_LANE_ID && onFilterToLane ? (
              <button
                type="button"
                className="w-full rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium ds-text-primary hover:bg-[var(--surface-base)]"
                onClick={() => {
                  onFilterToLane(task.group);
                  onOpenChange(false);
                }}
              >
                {ORCHESTRATION_UI_COPY.roadmapGanttFilterToLaneCta}
              </button>
            ) : null}
            {task.kind === 'task' && deliveryBoardHref ? (
              <Link
                to={deliveryBoardHref}
                className="flex w-full items-center justify-center rounded-md border border-[var(--border-default)] bg-[var(--surface-raised)] px-3 py-2 text-xs font-medium ds-text-primary no-underline hover:bg-[var(--surface-base)]"
                onClick={() => onOpenChange(false)}
              >
                {PLAN_BOARD_COPY.roadmapDrawerDeliveryBoardCta}
              </Link>
            ) : null}
            {task.kind === 'task' && pb.status === 'loading' ? (
              <p className="text-muted-foreground text-xs" role="status">
                {ORCHESTRATION_UI_COPY.previewLoading}
              </p>
            ) : null}
            {task.kind === 'task' && pb.status === 'no_row' ? (
              <p className="text-muted-foreground text-xs" role="status">
                {PLAN_BOARD_COPY.roadmapDrawerMoveNoCardHint}
              </p>
            ) : null}
            {task.kind === 'task' && pb.status === 'blocked_no_pack' ? (
              <p className="text-muted-foreground text-xs" role="status">
                {PLAN_BOARD_COPY.roadmapDrawerMoveNoPackHint}
              </p>
            ) : null}
            {task.kind === 'task' && pb.status === 'blocked_governance' ? (
              <p className="text-muted-foreground text-xs" role="status">
                {PLAN_BOARD_COPY.roadmapDrawerMoveGovernanceBlockedHint}
              </p>
            ) : null}
            {task.kind === 'task' && pb.status === 'query_failed' ? (
              <p className="text-muted-foreground text-xs" role="status">
                {PLAN_BOARD_COPY.roadmapDrawerMoveErrorToast}
              </p>
            ) : null}
            {task.kind === 'task' && pb.status === 'ready' && currentDeliveryColumnLabel ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="border-border bg-[var(--surface-raised)] w-full justify-between text-xs font-medium"
                    aria-label={PLAN_BOARD_COPY.roadmapDrawerMoveMenuAriaLabel}
                    disabled={patchMutation.isPending}
                  >
                    <span>{PLAN_BOARD_COPY.roadmapDrawerMoveMenuHeading}</span>
                    <CaretDownIcon size={16} aria-hidden className="shrink-0 opacity-70" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[12rem]" collisionPadding={8}>
                  {PLAN_BOARD_UI_COLUMNS.map((colId) => (
                    <DropdownMenuItem
                      key={colId}
                      disabled={
                        patchMutation.isPending ||
                        colId === currentDeliveryColumnLabel ||
                        !isPlanBoardDrawerMoveAllowed(pb.role, currentDeliveryColumnLabel, colId)
                      }
                      onSelect={(e) => {
                        e.preventDefault();
                        void submitMove(colId);
                      }}
                    >
                      {PLAN_BOARD_COLUMN_HEADINGS_EN[colId]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Owner</div>
              <div className="text-[var(--text-secondary)]">{task.owner || '—'}</div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Status</div>
              <div className="text-[var(--text-secondary)]">{task.status}</div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Risk</div>
              <div className="text-[var(--text-secondary)]">{isBlocked ? 'High (blocked)' : 'Normal'}</div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Impact</div>
              <div className="text-[var(--text-secondary)]">{task.impact}</div>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Deliverables</div>
              <ul className="mt-2 list-disc pl-5 text-[var(--text-secondary)]">
                {task.deliverables.length === 0 ? <li>Not specified</li> : null}
                {task.deliverables.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            </div>
            <div className="rounded-md border border-[var(--border-default)] p-3">
              <div className="font-medium text-[var(--text-primary)]">Blocking dependencies</div>
              <ul className="mt-2 list-disc pl-5 text-[var(--text-secondary)]">
                {incomingDependencies.length === 0 ? <li>No blocking dependencies</li> : null}
                {incomingDependencies.map((dep) => (
                  <li key={dep.id}>
                    {taskTitleById.get(dep.from) ?? dep.from} ({dep.kind}, {dep.strength})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
