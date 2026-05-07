import { useState } from 'react';

import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { PLAN_BOARD_COPY } from '../../config/plan-board-copy.en';
import { usePostPlanBoardManualCardMutation } from '../../data/api/plan-board-queries';

export type PlanManualCardCreateFormProps = {
  auditId: string;
  orchestrationPackVersion: number;
  disabled: boolean;
  /** Called after a successful POST (e.g. close Roadmap dialog). */
  onCreated?: () => void;
};

/**
 * Shared POST `/plan/board/cards` form for Delivery Board inline section and Roadmap toolbar dialog (consultant-only parents).
 */
export function PlanManualCardCreateForm(props: PlanManualCardCreateFormProps) {
  const { auditId, orchestrationPackVersion, disabled, onCreated } = props;
  const mutation = usePostPlanBoardManualCardMutation(auditId);
  const [manualLane, setManualLane] = useState('marketing_narrative');
  const [manualTitle, setManualTitle] = useState('');

  return (
    <form
      data-plan-manual-card-form=""
      className="flex flex-col gap-3 md:flex-row md:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const titleValue = manualTitle.trim();
        if (titleValue.length < 2) return;
        const laneValue = manualLane.trim() || 'marketing_narrative';
        void mutation
          .mutateAsync({
            title: titleValue,
            lane: laneValue,
          })
          .then(() => {
            setManualTitle('');
            onCreated?.();
          });
      }}
    >
      <div className="flex-1 space-y-2">
        <label className="text-muted-foreground text-xs sr-only" htmlFor="plan-manual-card-title-shared">
          {PLAN_BOARD_COPY.manualCardSectionTitle}
        </label>
        <Input
          id="plan-manual-card-title-shared"
          data-plan-manual-card-title=""
          value={manualTitle}
          onChange={(event) => setManualTitle(event.target.value)}
          placeholder={PLAN_BOARD_COPY.manualCardTitlePlaceholder}
        />
      </div>
      <div className="md:w-[14rem]">
        <label className="text-muted-foreground text-xs sr-only" htmlFor="plan-manual-card-lane-shared">
          {PLAN_BOARD_COPY.laneLabelPrefix}
        </label>
        <Input
          id="plan-manual-card-lane-shared"
          value={manualLane}
          onChange={(event) => setManualLane(event.target.value)}
          placeholder={PLAN_BOARD_COPY.manualLanePlaceholder}
        />
      </div>
      <Button
        type="submit"
        size="sm"
        disabled={mutation.isPending || orchestrationPackVersion <= 0 || disabled}
      >
        {PLAN_BOARD_COPY.manualSubmitCta}
      </Button>
    </form>
  );
}
