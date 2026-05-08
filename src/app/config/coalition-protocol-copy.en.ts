export const COALITION_PROTOCOL_COPY = {
  monitor: {
    sectionTitle: 'Coalition director rounds',
    contextDirector: 'Client situation snapshot',
    hypothesis: 'Hypothesis round',
    alignment: 'Alignment round',
    resolver: 'Conflict resolver',
    finalized: 'Finalize prompts use coalition context',
    pending: 'Waiting for coalition events',
    active: 'Active',
    complete: 'Complete',
    conflictEscalation: 'Conflict escalation required',
  },
  gate: {
    approveCoalitionTitle: 'Approve client situation',
    approveCoalitionBody:
      'Review the shared situation snapshot before final domain recommendations use coalition context.',
    snapshotHeading: 'Client situation snapshot',
    noSnapshot: 'No coalition snapshot has been saved for this audit yet.',
  },
  conflictMatrix: {
    title: 'Conflict matrix',
    empty: 'No cross-domain conflicts have been recorded.',
    resolved: 'Resolved conflicts',
    unresolved: 'Unresolved conflicts',
    parties: 'Parties',
    decision: 'Decision',
    recommendedAction: 'Recommended action',
  },
  chain: {
    title: 'Coalition chain',
    empty: 'No coalition hypothesis chain is available yet.',
    hypotheses: 'Hypotheses',
    corrections: 'Self-corrections',
    dependencies: 'Cross-domain dependencies',
  },
} as const;
