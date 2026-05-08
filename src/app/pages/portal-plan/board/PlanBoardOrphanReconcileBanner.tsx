import { useState } from 'react';

import { Button } from '../../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../components/ui/dialog';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import type { PlanBoardReconcilePreviewDto } from '../../../data/api/orchestration-types';
import {
  usePostPlanBoardReconcileMutation,
  usePostPlanBoardReconcilePreviewMutation,
} from '../../../data/api/plan-board-queries';

export type PlanBoardOrphanReconcileBannerProps = {
  auditId: string | undefined;
  orchestrationPackVersion: number;
  reconcilePreviewEnabled: boolean;
  /** Softer chrome when nested inside grouped plan status banners. */
  surfaceTone?: 'default' | 'embedded';
};

/**
 * Consultant callout when orphan cards exist: re-sync with pack and optional dry-run preview (feature-gated).
 */
export function PlanBoardOrphanReconcileBanner(props: PlanBoardOrphanReconcileBannerProps) {
  const surfaceTone = props.surfaceTone ?? 'default';
  const reconcileMutation = usePostPlanBoardReconcileMutation(props.auditId);
  const previewMutation = usePostPlanBoardReconcilePreviewMutation(props.auditId);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [preview, setPreview] = useState<PlanBoardReconcilePreviewDto | null>(null);

  const reconcileDisabled = reconcileMutation.isPending || props.orchestrationPackVersion <= 0;
  const previewDisabled =
    previewMutation.isPending || !props.auditId || props.orchestrationPackVersion <= 0;

  async function handlePreview(): Promise<void> {
    if (!props.auditId) return;
    const data = await previewMutation.mutateAsync();
    setPreview(data);
    setPreviewOpen(true);
  }

  async function handleConfirmReconcile(): Promise<void> {
    setPreviewOpen(false);
    await reconcileMutation.mutateAsync();
  }

  return (
    <>
      <div
        role="status"
        className={
          surfaceTone === 'embedded' ?
            'bg-muted/10 flex flex-col gap-3 rounded-md px-3 py-3 md:flex-row md:items-center md:justify-between'
          : 'border-border bg-muted/20 flex flex-col gap-3 rounded-lg border px-4 py-3 md:flex-row md:items-center md:justify-between'
        }
      >
        <div>
          <div className="text-foreground text-sm font-medium">{PLAN_BOARD_COPY.reconcileBannerTitle}</div>
          <p className="text-muted-foreground mt-1 text-sm">{PLAN_BOARD_COPY.reconcileBannerBody}</p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
          {props.reconcilePreviewEnabled ? (
            <Button
              variant="outline"
              type="button"
              size="sm"
              disabled={previewDisabled}
              onClick={() => void handlePreview()}
            >
              {PLAN_BOARD_COPY.reconcilePreviewCta}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            type="button"
            size="sm"
            disabled={reconcileDisabled}
            onClick={() => void reconcileMutation.mutateAsync()}
          >
            {PLAN_BOARD_COPY.reconcileBannerCta}
          </Button>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{PLAN_BOARD_COPY.reconcilePreviewDialogTitle}</DialogTitle>
            <DialogDescription>{PLAN_BOARD_COPY.reconcilePreviewDialogDescription}</DialogDescription>
          </DialogHeader>
          {preview ? (
            <div className="text-muted-foreground space-y-4 text-sm">
              <ul className="space-y-1" role="list">
                <li>{`${PLAN_BOARD_COPY.reconcilePreviewMatchedLabel}: ${String(preview.matched)}`}</li>
                <li>{`${PLAN_BOARD_COPY.reconcilePreviewAddedLabel}: ${String(preview.auto_created)}`}</li>
                <li>{`${PLAN_BOARD_COPY.reconcilePreviewOrphanNodeLabel}: ${String(preview.orphaned_node_removed)}`}</li>
                <li>{`${PLAN_BOARD_COPY.reconcilePreviewOrphanLaneLabel}: ${String(preview.orphaned_lane_changed)}`}</li>
              </ul>
              {(preview.sample_new_backlog_cards ?? []).length > 0 ? (
                <div>
                  <div className="text-foreground font-medium">{PLAN_BOARD_COPY.reconcilePreviewSamplesNewHeading}</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5" role="list">
                    {(preview.sample_new_backlog_cards ?? []).map((row) => (
                      <li key={row.canonical_node_key}>{row.title}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {(preview.sample_orphan_node_removed ?? []).length > 0 ? (
                <div>
                  <div className="text-foreground font-medium">{PLAN_BOARD_COPY.reconcilePreviewSamplesOrphanHeading}</div>
                  <ul className="mt-1 list-disc space-y-1 pl-5" role="list">
                    {(preview.sample_orphan_node_removed ?? []).map((row) => (
                      <li key={row.canonical_node_key}>{row.title}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)}>
              {PLAN_BOARD_COPY.reconcilePreviewCloseCta}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={reconcileDisabled}
              onClick={() => void handleConfirmReconcile()}
            >
              {PLAN_BOARD_COPY.reconcilePreviewConfirmCta}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
