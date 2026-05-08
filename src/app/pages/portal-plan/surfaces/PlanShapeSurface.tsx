import { StrategyLab } from '../../strategy-lab/StrategyLabPage';

/**
 * Shape mode surface — orchestrator, pack, compile (embedded Strategy Lab studio under `/plan?mode=shape`).
 */
export function PlanShapeSurface() {
  return <StrategyLab embedded planStudioScrollTarget="shape-pack" />;
}
