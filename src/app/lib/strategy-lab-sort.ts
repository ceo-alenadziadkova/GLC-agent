import { STRATEGY_LAB_ROI_SORT_WEIGHTS, type StrategyLabSortMode } from '../config/strategy-lab';
import type { StrategyInitiative } from '../data/auditTypes';

const W = STRATEGY_LAB_ROI_SORT_WEIGHTS;

function impactScore(i: StrategyInitiative): number {
  if (i.impact === 'high') return W.impactHigh;
  if (i.impact === 'low') return W.impactLow;
  return W.impactMedium;
}

function effortScore(i: StrategyInitiative): number {
  if (i.effort === 'low') return W.effortLowBonus;
  if (i.effort === 'high') return W.effortHighBonus;
  return W.effortMediumBonus;
}

function priorityBonus(i: StrategyInitiative): number {
  const p = 'priority' in i ? (i as { priority?: string }).priority : undefined;
  if (p === 'critical') return W.criticalPriorityBonus;
  if (p === 'high') return W.highPriorityBonus;
  return 0;
}

function roiScore(i: StrategyInitiative): number {
  return impactScore(i) + effortScore(i) + priorityBonus(i);
}

export function compareStrategyInitiatives(a: StrategyInitiative, b: StrategyInitiative, mode: StrategyLabSortMode): number {
  if (mode === 'domain') {
    const da = 'domain' in a && typeof (a as { domain?: string }).domain === 'string' ? (a as { domain: string }).domain : '';
    const db = 'domain' in b && typeof (b as { domain?: string }).domain === 'string' ? (b as { domain: string }).domain : '';
    const c = da.localeCompare(db);
    if (c !== 0) return c;
  }
  if (mode === 'effort') {
    const order = { low: 0, medium: 1, high: 2 } as const;
    const c = order[a.effort] - order[b.effort];
    if (c !== 0) return c;
  }
  if (mode === 'impact' || mode === 'roi') {
    const va = mode === 'roi' ? roiScore(a) : impactScore(a);
    const vb = mode === 'roi' ? roiScore(b) : impactScore(b);
    if (va !== vb) return vb - va;
  }
  return a.title.localeCompare(b.title);
}

export function sortStrategyInitiatives(list: StrategyInitiative[], mode: StrategyLabSortMode): StrategyInitiative[] {
  return [...list].sort((a, b) => compareStrategyInitiatives(a, b, mode));
}
