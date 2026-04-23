/**
 * Static policy for CAO sub-agent orchestrator (QA copy, deterministic fallbacks).
 */
export const DIRECTOR_CAO_ORCHESTRATOR_POLICY = {
  qaBlock: {
    coherence: 'Process map, automation candidates, and throughput notes must reference the same operating cadence.',
    feasibility: 'Automation ideas must respect stated adoption and governance constraints.',
    measurement: ['Cycle time', 'Error / rework rate', 'SLA adherence'],
  },
} as const;
