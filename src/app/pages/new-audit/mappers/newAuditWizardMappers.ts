import { areEarlyBriefCaptureSlotsSatisfied, arePreBriefSubmitSlotsSatisfied, type IntakeSurface } from '@glc/intake-core';
import { APP_FEATURE_FLAGS } from '../../../config/app-feature-flags';
import { BRIEF_LAYOUT_WIZARD } from '../wizard-config/wizard-constants';
import { newAuditStep1CollectionMode } from '../newAuditValidation';
import type { BriefIntakeAnalyticsSurface } from '../../../lib/brief-intake-analytics';
import type { IntakeVersionTuple } from '../../../data/auditTypes';

export function getBriefTailoredFollowUpUnlocked(args: {
  briefTailoredPhaseUnlocked: boolean;
  intakePrefillActive: boolean;
}): boolean {
  return (
    args.briefTailoredPhaseUnlocked ||
    args.intakePrefillActive ||
    !APP_FEATURE_FLAGS.newAuditIntelligenceSnapshotStepEnabled
  );
}

export function getEarlyIntelligenceEligible(args: {
  noPublicWebsite: boolean;
  isClientSelfServe: boolean;
  draftAuditId: string | null;
  intakePrefillActive: boolean;
  briefTailoredFollowUpUnlocked: boolean;
  intakeMapForSnapshots: Record<string, unknown>;
}): boolean {
  if (!APP_FEATURE_FLAGS.briefEarlyIntelligenceSnapshotEnabled) return false;
  if (!APP_FEATURE_FLAGS.newAuditIntelligenceSnapshotStepEnabled) return false;
  if (args.noPublicWebsite) return false;
  if (args.isClientSelfServe || !args.draftAuditId) return false;
  if (args.intakePrefillActive) return false;
  if (args.briefTailoredFollowUpUnlocked) return false;
  return (
    areEarlyBriefCaptureSlotsSatisfied(args.intakeMapForSnapshots) &&
    !arePreBriefSubmitSlotsSatisfied(args.intakeMapForSnapshots)
  );
}

export function getNewAuditBankIntakeSurface(args: {
  noPublicWebsite: boolean;
  isClientSelfServe: boolean;
}): IntakeSurface | undefined {
  if (args.noPublicWebsite) return undefined;
  return args.isClientSelfServe ? 'client_form' : 'consultant_interview';
}

export function getNewAuditCollectionModeForPlan(args: {
  noPublicWebsite: boolean;
  isClientSelfServe: boolean;
  briefTailoredFollowUpUnlocked: boolean;
}) {
  return newAuditStep1CollectionMode({
    noPublicWebsite: args.noPublicWebsite,
    isClientSelfServe: args.isClientSelfServe,
    tailoredPhaseUnlocked: args.briefTailoredFollowUpUnlocked,
  });
}

export function getBriefWizardIntakeAnalytics(args: {
  draftAuditId: string | null;
  noPublicWebsite: boolean;
  briefLayoutChoice: string | null;
  isClientSelfServe: boolean;
  draftIntakeVersions: IntakeVersionTuple | null;
}):
  | {
      auditId: string;
      surface: BriefIntakeAnalyticsSurface;
      getIntakeVersions: () => IntakeVersionTuple | null;
    }
  | undefined {
  if (!args.draftAuditId || args.noPublicWebsite || args.briefLayoutChoice !== BRIEF_LAYOUT_WIZARD) {
    return undefined;
  }
  const surface: BriefIntakeAnalyticsSurface = args.isClientSelfServe ? 'client_form' : 'consultant_interview';
  return {
    auditId: args.draftAuditId,
    surface,
    getIntakeVersions: () => args.draftIntakeVersions,
  };
}
