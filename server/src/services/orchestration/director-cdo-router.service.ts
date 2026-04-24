/**
 * CDO (UX & conversion) routing — pure classification for deep-dive orchestration.
 * Replace heuristics with access-aware + maturity scoring per CDO-INSTRUCTIONS when sub-agents ship.
 */
export type CdoDeepDiveCase = 'greenfield' | 'optimization' | 'expansion';

export function routeCdoDeepDiveCase(input: { goals: string[]; constraints: string[] }): CdoDeepDiveCase {
  const blob = `${input.goals.join(' ')} ${input.constraints.join(' ')}`.toLowerCase();
  if (/\b(new product|from scratch|launch|mvp|greenfield)\b/.test(blob)) {
    return 'greenfield';
  }
  if (/\b(expand|scale|international|new market)\b/.test(blob)) {
    return 'expansion';
  }
  return 'optimization';
}
