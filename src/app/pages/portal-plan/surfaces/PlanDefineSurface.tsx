import { StrategyLab } from '../../strategy-lab/StrategyLabPage';

/**
 * Define mode surface — constraints and benchmarks (embedded Strategy Lab studio under `/plan?mode=define`).
 */
export function PlanDefineSurface() {
  return <StrategyLab embedded planStudioScrollTarget="define" />;
}
