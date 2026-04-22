/**
 * CSO (security & compliance) routing — case class A/B/C/D from CSO-INSTRUCTIONS.
 * Heuristic only until case detector LLM is approved.
 */
export type CsoDeepDiveCase = 'A_zero_knowledge' | 'B_regulated' | 'C_data_heavy' | 'D_incident';

export function routeCsoDeepDiveCase(input: { goals: string[]; constraints: string[] }): CsoDeepDiveCase {
  const blob = `${input.goals.join(' ')} ${input.constraints.join(' ')}`.toLowerCase();
  if (/\b(incident|breach|ransom|forensic|ir\b|compromise)\b/.test(blob)) {
    return 'D_incident';
  }
  if (/\b(hipaa|gdpr|pci|soc2|iso|fedramp|regulated)\b/.test(blob)) {
    return 'B_regulated';
  }
  if (/\b(pii|phi|data warehouse|etl|pipeline|egress|ingress)\b/.test(blob)) {
    return 'C_data_heavy';
  }
  return 'A_zero_knowledge';
}
