import type { AuditCoveragePackage } from '../../../data/auditTypes';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';

export function canProceedFromStep0(args: {
  step0Valid: boolean;
  coverageValid: boolean;
  coveragePackage: AuditCoveragePackage | null;
}): boolean {
  return args.step0Valid && args.coverageValid && args.coveragePackage != null;
}

export function shouldOpenSnapshotGate(args: {
  isClientSelfServe: boolean;
  draftAuditId: string | null;
  briefIntelligenceSubStep: 'short_brief' | 'snapshot_confirm';
  intakePrefillActive: boolean;
}): boolean {
  return (
    APP_FEATURE_FLAGS.newAuditIntelligenceSnapshotStepEnabled &&
    !args.isClientSelfServe &&
    Boolean(args.draftAuditId) &&
    args.briefIntelligenceSubStep === 'short_brief' &&
    !args.intakePrefillActive
  );
}
