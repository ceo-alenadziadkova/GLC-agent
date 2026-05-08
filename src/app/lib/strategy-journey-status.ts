/**
 * Derived planning-journey statuses for Strategy Lab + Plan surfaces.
 * Uses the same semantic signals as the former 3-step strip, split into Manifest vs Pack vs Plan execution.
 */

export type StrategyJourneyStepStatus = 'done' | 'current' | 'pending';

export type StrategyJourneyStepId = 'context' | 'manifest' | 'pack' | 'plan';

export type StrategyJourneyStepComputed = {
  id: StrategyJourneyStepId;
  status: StrategyJourneyStepStatus;
};

export type ComputeStrategyJourneyStepsArgs = {
  effectiveConstraintsPresent: boolean;
  executionPlanDomainCount: number;
  manifestSnapshotId: string | null | undefined;
  orchestrationPackVersion: number | null | undefined;
};

function packBuilt(orchestrationPackVersion: number | null | undefined): boolean {
  return typeof orchestrationPackVersion === 'number' && orchestrationPackVersion > 0;
}

/**
 * Computes the four-step journey (Context · Manifest · Pack · Plan links).
 */
export function computeStrategyJourneyStepStatuses(args: ComputeStrategyJourneyStepsArgs): ReadonlyArray<StrategyJourneyStepComputed> {
  const hasContextDone =
    Boolean(args.effectiveConstraintsPresent) &&
    args.executionPlanDomainCount > 0;

  const hasManifestDone =
    Boolean(args.manifestSnapshotId) || packBuilt(args.orchestrationPackVersion);

  const hasPackDone = packBuilt(args.orchestrationPackVersion);

  /** First unfinished step becomes current; if all structural steps done, focus Plan for execution visibility. */
  let contextStatus: StrategyJourneyStepStatus;
  let manifestStatus: StrategyJourneyStepStatus;
  let packStepStatus: StrategyJourneyStepStatus;
  let planStatus: StrategyJourneyStepStatus;

  if (!hasContextDone) {
    contextStatus = 'current';
    manifestStatus = 'pending';
    packStepStatus = 'pending';
    planStatus = 'pending';
  } else if (!hasManifestDone) {
    contextStatus = 'done';
    manifestStatus = 'current';
    packStepStatus = 'pending';
    planStatus = 'pending';
  } else if (!hasPackDone) {
    contextStatus = 'done';
    manifestStatus = 'done';
    packStepStatus = 'current';
    planStatus = 'pending';
  } else {
    contextStatus = 'done';
    manifestStatus = 'done';
    packStepStatus = 'done';
    /** Pack is saved; sequencing and execution belong on Plan (Roadmap + Timeline). */
    planStatus = 'current';
  }

  const out: StrategyJourneyStepComputed[] = [
    { id: 'context', status: contextStatus },
    { id: 'manifest', status: manifestStatus },
    { id: 'pack', status: packStepStatus },
    { id: 'plan', status: planStatus },
  ];

  return out;
}
