/**
 * CAO (automation & processes) routing — zone/stage discriminator for future two-stage flow.
 * Stub values map to CAO-INSTRUCTIONS “Discovery → Deep-audit” without persisting a parallel registry.
 */
export type CaoDeepDiveRoute = {
  zone_stage: 'discovery' | 'deep_audit';
  zone_focus: 'governance' | 'operations' | 'synthesis';
};

export function routeCaoDeepDive(input: { goals: string[]; constraints: string[] }): CaoDeepDiveRoute {
  const blob = `${input.goals.join(' ')} ${input.constraints.join(' ')}`.toLowerCase();
  const deep = /\b(sla|sop|audit|compliance|control|policy|governance)\b/.test(blob);
  return {
    zone_stage: deep ? 'deep_audit' : 'discovery',
    zone_focus: deep ? 'governance' : 'operations',
  };
}
