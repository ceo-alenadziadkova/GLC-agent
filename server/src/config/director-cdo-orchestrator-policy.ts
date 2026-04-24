/**
 * Static policy for CDO sub-agent orchestrator (QA copy, deterministic fallbacks).
 * Keep literals here — not in services (no-hardcode gate).
 */
export const DIRECTOR_CDO_ORCHESTRATOR_POLICY = {
  qaBlock: {
    coherence: 'Funnel stages, friction signals, and experiments should reference the same conversion path.',
    feasibility: 'Experiments must be runnable within stated constraints; flag instrumentation gaps explicitly.',
    measurement: ['Primary conversion rate', 'Step-to-step drop-off', 'Time-to-value'],
  },
} as const;
