import type { ReactNode } from 'react';

import { Button } from '../../components/ui/button';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../components/ui/resizable';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '../../components/ui/sheet';
import { STRATEGY_LAB_COPY } from '../../config/strategy-lab-copy';
import { STRATEGY_LAB_LAYOUT_POLICY, STRATEGY_LAB_PAGE_ANCHORS } from '../../config/strategy-lab';

/** How the plan summary column is presented (single rail — no parallel mobile/desktop trees). */
export type PlanSummaryRailPresentation = 'split' | 'consultant-sheet' | 'main-only';

type PlanSummaryRailProps = {
  /** Derived in parent from role + breakpoints; rail maps to layout with `@container` + width queries. */
  presentation: PlanSummaryRailPresentation;
  inspectPackScrollInner: ReactNode;
  planSummaryDetailBlock: ReactNode;
  planSummaryFooter: ReactNode;
  planSummaryDesktopChrome: ReactNode;
  isSummarySheetOpen: boolean;
  onSummarySheetOpenChange: (open: boolean) => void;
  selectedPackNodeId: string | null;
};

/**
 * Strategy Lab main column + plan summary: one tree.
 * - `split`: resizable main + summary (consultant wide / client tablet+).
 * - `consultant-sheet`: summary in bottom sheet (consultant mid-width).
 * - `main-only`: summary hidden (narrow mobile).
 */
export function PlanSummaryRail(props: PlanSummaryRailProps) {
  const {
    presentation,
    inspectPackScrollInner,
    planSummaryDetailBlock,
    planSummaryFooter,
    planSummaryDesktopChrome,
    isSummarySheetOpen,
    onSummarySheetOpenChange,
    selectedPackNodeId,
  } = props;

  const mainScroll = (
    <div
      id={STRATEGY_LAB_PAGE_ANCHORS.inspectPack}
      className="bg-background min-h-0 flex-1 scroll-mt-20 overflow-y-auto"
    >
      {inspectPackScrollInner}
    </div>
  );

  const sheetChrome = (
    <div className="bg-card sticky bottom-0 z-10 shrink-0 border-t border-border px-4 py-3">
      <Sheet open={isSummarySheetOpen} onOpenChange={onSummarySheetOpenChange}>
        <SheetTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className="flex h-auto min-h-11 w-full flex-col gap-1 py-3"
            aria-haspopup="dialog"
            aria-expanded={isSummarySheetOpen}
          >
            <span className="text-foreground text-sm font-semibold">
              {STRATEGY_LAB_COPY.panel.summaryDrawerTriggerLabel}
            </span>
            <span className="text-muted-foreground text-xs">
              {selectedPackNodeId
                ? STRATEGY_LAB_COPY.panel.summaryDrawerNodeSelectedHint
                : STRATEGY_LAB_COPY.panel.summaryDrawerNoSelectionHint}
            </span>
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex h-full flex-col gap-0 p-0 sm:max-w-sm">
          <SheetHeader className="border-border space-y-1 border-b px-4 py-4 text-left">
            <SheetTitle>{STRATEGY_LAB_COPY.panel.summaryDrawerTitle}</SheetTitle>
            <SheetDescription>{STRATEGY_LAB_COPY.panel.summaryHint}</SheetDescription>
          </SheetHeader>
          <div className="bg-card flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="flex-1 space-y-5 p-5">{planSummaryDetailBlock}</div>
            {planSummaryFooter}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );

  if (presentation === 'main-only') {
    return (
      <div className="bg-background @container strategy-lab-workspace-main ds-audit-workspace-main-h flex flex-col">
        {mainScroll}
      </div>
    );
  }

  if (presentation === 'consultant-sheet') {
    return (
      <div className="bg-background @container strategy-lab-workspace-main ds-audit-workspace-main-h flex min-h-0 flex-1 flex-col">
        {mainScroll}
        {sheetChrome}
      </div>
    );
  }

  return (
    <div className="@container strategy-lab-workspace-main">
      <ResizablePanelGroup
        key="strategy-lab-layout-desktop"
        direction="horizontal"
        className="ds-audit-workspace-main-h"
        autoSaveId={`${STRATEGY_LAB_LAYOUT_POLICY.sidebarLayoutAutoSaveId}:lg`}
      >
        <ResizablePanel
          id="strategy-lab-main"
          order={1}
          defaultSize={100 - STRATEGY_LAB_LAYOUT_POLICY.summaryPanelDefaultSizePct}
          minSize={STRATEGY_LAB_LAYOUT_POLICY.mainPanelMinSizePct}
          className="min-w-0"
        >
          <div
            id={STRATEGY_LAB_PAGE_ANCHORS.inspectPack}
            className="bg-background h-full min-h-0 flex-1 scroll-mt-20 overflow-y-auto"
          >
            {inspectPackScrollInner}
          </div>
        </ResizablePanel>

        <ResizableHandle
          aria-label={STRATEGY_LAB_COPY.panel.resizeHandle}
          title={STRATEGY_LAB_COPY.panel.resizeHint}
          className="w-1.5 bg-[var(--border-subtle)] after:w-1.5"
        />

        <ResizablePanel
          id="strategy-lab-summary"
          order={2}
          defaultSize={STRATEGY_LAB_LAYOUT_POLICY.summaryPanelDefaultSizePct}
          minSize={STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMinSizePct}
          maxSize={STRATEGY_LAB_LAYOUT_POLICY.summaryPanelMaxSizePct}
          className="min-w-0"
        >
          <div className="bg-card flex h-full min-h-0 w-full flex-col overflow-y-auto">{planSummaryDesktopChrome}</div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
