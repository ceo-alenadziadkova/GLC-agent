import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { BriefResponses } from '../../../data/briefQuestions';
import type {
  AuditCoveragePackage,
  BriefResponseSource,
  DomainKey,
  IntakeNextBestAction,
  IntakeReadinessBadge,
  IntakeVersionTuple,
} from '../../../data/auditTypes';
import type { BriefIntakeAnalyticsSurface } from '../../../lib/brief-intake-analytics';
import type { useIntakeBankMetrics } from '../../../hooks/useIntakeWizard';

export type NewAuditVariant = 'consultant' | 'client_self_serve';
export type BriefLayoutChoice = 'unset' | 'classic' | 'wizard';

export type NewAuditWizardContract = {
  isClientSelfServe: boolean;
  intakeTokenFromUrl: string;
  fromDiscovery: string;
  step: 0 | 1 | 2;
  setStep: Dispatch<SetStateAction<0 | 1 | 2>>;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  step0Valid: boolean;
  briefProductMode: 'express' | 'full';
  url: string;
  setUrl: Dispatch<SetStateAction<string>>;
  noPublicWebsite: boolean;
  setNoPublicWebsite: Dispatch<SetStateAction<boolean>>;
  name: string;
  setName: Dispatch<SetStateAction<string>>;
  industry: string;
  setIndustry: Dispatch<SetStateAction<string>>;
  industrySpecify: string;
  setIndustrySpecify: Dispatch<SetStateAction<string>>;
  coveragePackage: AuditCoveragePackage;
  setCoveragePackage: Dispatch<SetStateAction<AuditCoveragePackage>>;
  selectedDomains: DomainKey[];
  setSelectedDomains: Dispatch<SetStateAction<DomainKey[]>>;
  toggleDomainSelection: (domain: DomainKey) => void;
  recommendedDomains: DomainKey[];
  responses: BriefResponses;
  setResponses: Dispatch<SetStateAction<BriefResponses>>;
  intakePrefillActive: boolean;
  discoveryPrefilled: boolean;
  answeredRequired: number;
  pipelineRequiredTotal: number;
  step2Complete: boolean;
  progressPct: number;
  readinessBadge: IntakeReadinessBadge;
  nextBestAction: IntakeNextBestAction;
  bankMetrics: ReturnType<typeof useIntakeBankMetrics>;
  briefLayoutChoice: BriefLayoutChoice;
  setBriefLayoutChoice: Dispatch<SetStateAction<BriefLayoutChoice>>;
  layoutSelected: boolean;
  handleSelectConsultantBriefLayout: (mode: 'classic' | 'wizard') => void;
  handleChangeConsultantBriefLayout: () => void;
  briefWizardIntakeAnalytics:
    | {
        auditId: string;
        surface: BriefIntakeAnalyticsSurface;
        getIntakeVersions: () => IntakeVersionTuple | null;
      }
    | undefined;
  interviewMode: boolean;
  setInterviewMode: Dispatch<SetStateAction<boolean>>;
  handleResponseChange: (id: string, value: string | string[] | number | null) => void;
  handleSetUnknown: (id: string) => void;
  draftAuditId: string | null;
  draftIntakeVersions: IntakeVersionTuple | null;
  setDraftIntakeVersions: Dispatch<SetStateAction<IntakeVersionTuple | null>>;
  draftSaving: boolean;
  draftNotice: string | null;
  setDraftNotice: Dispatch<SetStateAction<string | null>>;
  draftError: string | null;
  setDraftError: Dispatch<SetStateAction<string | null>>;
  setDraftSaving: Dispatch<SetStateAction<boolean>>;
  setDraftAuditId: Dispatch<SetStateAction<string | null>>;
  draftRestoredVisible: boolean;
  setDraftRestoredVisible: Dispatch<SetStateAction<boolean>>;
  handleSaveClientDraft: () => Promise<void>;
  handleLaunch: (e: FormEvent) => Promise<void>;
  preBriefOpen: boolean;
  setPreBriefOpen: Dispatch<SetStateAction<boolean>>;
  preBriefCompany: string;
  setPreBriefCompany: Dispatch<SetStateAction<string>>;
  preBriefWebsite: string;
  setPreBriefWebsite: Dispatch<SetStateAction<string>>;
  preBriefIndustryField: string;
  setPreBriefIndustryField: Dispatch<SetStateAction<string>>;
  preBriefIndustrySpecify: string;
  setPreBriefIndustrySpecify: Dispatch<SetStateAction<string>>;
  preBriefMessage: string;
  setPreBriefMessage: Dispatch<SetStateAction<string>>;
  preBriefConsultantName: string;
  setPreBriefConsultantName: Dispatch<SetStateAction<string>>;
  preBriefExpectedContact: string;
  setPreBriefExpectedContact: Dispatch<SetStateAction<string>>;
  preBriefContactChannel: string;
  setPreBriefContactChannel: Dispatch<SetStateAction<string>>;
  preBriefEmail: string;
  setPreBriefEmail: Dispatch<SetStateAction<string>>;
  preBriefWhatsapp: string;
  setPreBriefWhatsapp: Dispatch<SetStateAction<string>>;
  preBriefLink: string | null;
  setPreBriefLink: Dispatch<SetStateAction<string | null>>;
  preBriefToken: string | null;
  setPreBriefToken: Dispatch<SetStateAction<string | null>>;
  preBriefLoading: boolean;
  setPreBriefLoading: Dispatch<SetStateAction<boolean>>;
  preBriefErr: string | null;
  setPreBriefErr: Dispatch<SetStateAction<string | null>>;
  closePreBriefModal: () => void;
  handlePreBriefCreate: () => Promise<void>;
  responseSource: BriefResponseSource;
};
