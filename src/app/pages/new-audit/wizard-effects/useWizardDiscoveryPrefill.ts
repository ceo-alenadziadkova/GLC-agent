import type { Dispatch, SetStateAction } from 'react';
import type { BriefResponses } from '../../../data/briefQuestions';
import { useWizardPrefillEffects } from './useWizardPrefillEffects';

export function useWizardDiscoveryPrefill(params: {
  intakeTokenFromUrl: string;
  fromDiscovery: string;
  isClientSelfServe: boolean;
  setResponses: Dispatch<SetStateAction<BriefResponses>>;
  setIntakePrefillActive: Dispatch<SetStateAction<boolean>>;
  setNoPublicWebsite: Dispatch<SetStateAction<boolean>>;
  setUrl: Dispatch<SetStateAction<string>>;
  setName: Dispatch<SetStateAction<string>>;
  setIndustry: Dispatch<SetStateAction<string>>;
  setIndustrySpecify: Dispatch<SetStateAction<string>>;
  setDiscoveryPrefilled: Dispatch<SetStateAction<boolean>>;
}) {
  useWizardPrefillEffects(params);
}
