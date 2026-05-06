import { useMemo, useState } from 'react';

import { Button } from '../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../components/ui/dialog';
import { PLAN_BOARD_COPY } from '../../config/plan-board-copy.en';
import { usePlanBoardQuery } from '../../data/api/plan-board-queries';
import { useProfile } from '../../hooks/useProfile';
import { isGlcOrchestrationPackView } from '../../lib/orchestration-pack-guards';
import { usePortalPlanOrchestration } from './PortalPlanOrchestrationProvider';
import { PlanManualCardCreateForm } from './PlanManualCardCreateForm';

/**
 * Consultant-only: add manual backlog cards from Roadmap toolbar (same API as Board inline form).
 */
export function PlanConsultantManualCardDialog() {
  const { isClient } = useProfile();
  const { auditId, packQuery, auditLoading, auditError, timelineQuery } = usePortalPlanOrchestration();
  const pack = packQuery.data?.pack ?? null;

  const timelineReady =
    !auditLoading && !auditError && !timelineQuery.isPending && !timelineQuery.isError && Boolean(timelineQuery.data?.timeline);

  const boardQueryEnabled =
    Boolean(auditId) &&
    timelineReady &&
    Boolean(pack) &&
    isGlcOrchestrationPackView(pack) &&
    !isClient;

  const boardQuery = usePlanBoardQuery({
    auditId,
    enabled: boardQueryEnabled,
  });

  const orchestrationPackVersion = packQuery.data?.orchestration_pack_version ?? 0;
  const governanceReadOnly = Boolean(boardQuery.data?.issues?.some((i) => i.code === 'governance_blocked'));
  const blockedNoPack = Boolean(boardQuery.data?.issues?.some((i) => i.code === 'no_pack'));

  const [open, setOpen] = useState(false);

  const disabled = useMemo(() => governanceReadOnly || blockedNoPack || boardQuery.isPending, [
    governanceReadOnly,
    blockedNoPack,
    boardQuery.isPending,
  ]);

  if (isClient || !boardQueryEnabled) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          {PLAN_BOARD_COPY.roadmapToolbarAddManualCardCta}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg border-border sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{PLAN_BOARD_COPY.manualCardSectionTitle}</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">{PLAN_BOARD_COPY.manualCardSectionHint}</p>
        <PlanManualCardCreateForm
          auditId={auditId}
          orchestrationPackVersion={orchestrationPackVersion}
          disabled={disabled}
          onCreated={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
