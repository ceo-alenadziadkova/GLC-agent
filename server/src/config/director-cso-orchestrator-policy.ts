/**
 * Static policy for CSO sub-agent orchestrator (QA copy, deterministic fallbacks).
 */
export const DIRECTOR_CSO_ORCHESTRATOR_POLICY = {
  qaBlock: {
    coherence: 'Case scope, threat model, and compliance priorities must align on the same evidence boundaries.',
    feasibility: 'Controls must be phrased as operational steps; flag legal interpretation gaps explicitly.',
    measurement: ['Control coverage', 'Mean time to detect', 'Policy exception rate'],
  },
} as const;
