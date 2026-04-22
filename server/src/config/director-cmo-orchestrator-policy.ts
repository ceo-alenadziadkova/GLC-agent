export const DIRECTOR_CMO_ORCHESTRATOR_POLICY = {
  qaBlock: {
    coherence: 'Selected analyses align with the requested marketing goal and package constraints.',
    feasibility: 'Recommendations are constrained by available package capacity and execution sequence.',
    measurement: ['pipeline_lead_volume', 'qualified_conversion_rate', 'time_to_first_pipeline'],
  },
  deterministicDefaults: {
    primaryGoal: 'Increase qualified pipeline',
    primaryConstraint: 'Keep execution complexity manageable',
    positioning: {
      differentiationAxes: ['speed_to_value', 'proof_quality', 'execution_clarity'],
      targetNiche: 'B2B growth teams needing execution clarity',
      categoryStrategy: 'Outcome-first advisory with operational follow-through',
    },
    contentIdeasMinCount: 50,
    trafficHypothesesMinCount: 20,
  },
} as const;
