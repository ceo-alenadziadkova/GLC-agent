import type { Dispatch, SetStateAction } from 'react';
import type { BriefResponses } from '../../../data/briefQuestions';
import { useDiscoverySessionPrefill, useIntakeTokenPrefill } from '../newAuditPrefill';

export function useWizardPrefillEffects(params: {
  intakeTokenFromUrl: string;
  isClientSelfServe: boolean;
  fromDiscovery: string;
  setResponses: Dispatch<SetStateAction<BriefResponses>>;
  setIntakePrefillActive: Dispatch<SetStateAction<boolean>>;
  setNoPublicWebsite: Dispatch<SetStateAction<boolean>>;
  setUrl: Dispatch<SetStateAction<string>>;
  setName: Dispatch<SetStateAction<string>>;
  setIndustry: Dispatch<SetStateAction<string>>;
  setIndustrySpecify: Dispatch<SetStateAction<string>>;
  setDiscoveryPrefilled: Dispatch<SetStateAction<boolean>>;
}): void {
  useIntakeTokenPrefill({
    intakeTokenFromUrl: params.intakeTokenFromUrl,
    isClientSelfServe: params.isClientSelfServe,
    setResponses: params.setResponses,
    setIntakePrefillActive: params.setIntakePrefillActive,
    setNoPublicWebsite: params.setNoPublicWebsite,
    setUrl: params.setUrl,
    setName: params.setName,
    setIndustry: params.setIndustry,
    setIndustrySpecify: params.setIndustrySpecify,
  });

  useDiscoverySessionPrefill({
    fromDiscovery: params.fromDiscovery,
    setResponses: params.setResponses,
    setDiscoveryPrefilled: params.setDiscoveryPrefilled,
    setNoPublicWebsite: params.setNoPublicWebsite,
    setIndustry: params.setIndustry,
  });
}
