import type { ComponentProps } from 'react';
import { PLAN_BOARD_COPY } from '../../../config/plan-board-copy.en';
import { PlanBoardOperationalStatusBlock } from './plan-board-operational-status-block';
import { PlanBoardOperationalDndGrid } from './plan-board-operational-dnd-grid';

type BoardColumnsProps = {
  status: ComponentProps<typeof PlanBoardOperationalStatusBlock>;
  grid: {
    visible: boolean;
    props: ComponentProps<typeof PlanBoardOperationalDndGrid>;
  };
};

export function BoardColumns(props: BoardColumnsProps) {
  const { status, grid } = props;

  return (
    <>
      <PlanBoardOperationalStatusBlock {...status} />
      {grid.visible ? <PlanBoardOperationalDndGrid {...grid.props} /> : null}
      <p className="text-muted-foreground text-xs">{PLAN_BOARD_COPY.parityNote}</p>
    </>
  );
}
