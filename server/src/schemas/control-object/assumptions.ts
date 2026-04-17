import type { AssumptionSource } from './primitives.js';

export interface ControlObjectAssumptionV1 {
  id: string;
  statement: string;
  source: AssumptionSource;
}

export interface ControlObjectAssumption extends ControlObjectAssumptionV1 {
  risk: 'low' | 'medium' | 'high';
  related_claim_ids: number[];
}
