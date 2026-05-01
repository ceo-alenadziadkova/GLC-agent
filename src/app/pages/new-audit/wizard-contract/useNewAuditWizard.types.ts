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
import type {
  AuditBriefIntelligenceSnapshotResponse,
  AuditBriefIntelligenceWordingResponse,
  BriefSchemaSnapshot,
} from '../../../data/api/brief-profile-platform';
import type { BriefIntakeAnalyticsSurface } from '../../../lib/brief-intake-analytics';
import type { useIntakeBankMetrics } from '../../../hooks/useIntakeWizard';

export type NewAuditVariant = 'consultant' | 'client_self_serve';
export type BriefLayoutChoice = 'unset' | 'classic' | 'wizard';

export type NewAuditWizardContract = {
  isClientSelfServe: boolean;
  intakeTokenFromUrl: string;
  fromDiscovery: string;
  step: 0 | 1 | 2 | 3;
  setStep: Dispatch<SetStateAction<0 | 1 | 2 | 3>>;
  /** When Basics is split (URL present), 0 = form, 1 = site pre-check. */
  basicsSubStep: 0 | 1;
  setBasicsSubStep: Dispatch<SetStateAction<0 | 1>>;
  /** True when the wizard shows a separate “site pre-check” sub-step before Brief (public URL). */
  useBasicsSiteScanSplit: boolean;
  /** 0..3 in four-step mode; 0..4 in five-step (Basics + site + Brief + Review + Launch). */
  visualWizardIndex: number;
  stepIndicatorVariant: 'four' | 'five';
  handleWizardStepIndicatorClick: (visual: number) => void;
  handleStep0ContinueFromBasics: () => Promise<void>;
  handleSiteCheckContinueToBrief: () => void;
  handleSiteCheckBackToBasicsForm: () => void;
  loading: boolean;
  setLoading: Dispatch<SetStateAction<boolean>>;
  error: string | null;
  setError: Dispatch<SetStateAction<string | null>>;
  step0Valid: boolean;
  /** Step 0: package + domain count within allowed range. */
  coverageValid: boolean;
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
  coveragePackage: AuditCoveragePackage | null;
  setCoveragePackage: Dispatch<SetStateAction<AuditCoveragePackage | null>>;
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
  /** Bank question ids for required pipeline gates that currently have an answer (for Step 2 review list). */
  answeredPipelineRequiredIds: string[];
  /**
   * After Save + intelligence wording (or when full bank applies without snapshot split), Step 1 uses the full
   * collection plan including business-tailored follow-ups — not only the pre_brief slice.
   */
  briefTailoredFollowUpUnlocked: boolean;
  /** Merged brief (Step 0 + cells) used for pipeline gates; drives answer column in Step 2 review table. */
  pipelineGateBriefResponses: BriefResponses;
  step2Complete: boolean;
  progressPct: number;
  readinessBadge: IntakeReadinessBadge;
  nextBestAction: IntakeNextBestAction;
  /** Server `GET …/brief/schema` diagnostic slice for step 1 (null when unavailable). */
  briefExecutionDiagnostic: Pick<
    BriefSchemaSnapshot,
    'readiness' | 'critical_signals' | 'remediation_queue'
  > | null;
  briefExecutionDiagnosticLoading: boolean;
  briefExecutionDiagnosticError: boolean;
  /** Resolver-visible question order from GET …/brief (wizard sequencing). */
  briefWizardServerVisibleQuestionIds: string[] | undefined;
  /** Increments only after server-side brief/context updates; prevents per-keystroke context refetches. */
  clientProjectContextSyncTick: number;
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
  /** Step 1 sequencing: short brief collection -> snapshot confirmation. */
  briefIntelligenceSubStep: 'short_brief' | 'snapshot_confirm';
  intelligenceSnapshotResult: AuditBriefIntelligenceSnapshotResponse | null;
  intelligenceSnapshotError: string | null;
  intelligenceSnapshotLoading: boolean;
  /** B1 client phrasing from `POST .../brief/intelligence-wording` (LLM-2). Canonical answer values unchanged. */
  intelligenceWordingUi: Pick<
    AuditBriefIntelligenceWordingResponse,
    'label_overrides' | 'hint_overrides' | 'option_display_overrides'
  >;
  intelligenceWordingLoading: boolean;
  intelligenceSnapshotPhase: 'standard' | 'early';
  intelEarlyMergePending: boolean;
  earlyIntelligenceEligible: boolean;
  runEarlyBriefIntelligenceSnapshot: () => Promise<void>;
  handleBriefCloneFromAudit: (sourceAuditId: string) => Promise<void>;
  handleStep1ContinueToReview: () => Promise<void>;
  handleIntelligenceSnapshotSaveApplyAndWording: (selectedInferredIds: Set<string>) => Promise<void>;
  handleIntelligenceSnapshotBackToBriefForm: () => void;
  handleIntelligenceSnapshotSkipToReview: () => void;
  runBriefIntelligenceSnapshot: (opts?: { earlyCapture?: boolean }) => Promise<void>;
  retryBriefIntelligenceSnapshot: () => Promise<void>;
  handleBackFromStep2ToStep1: () => void;
  handleBackFromStep1ToStep0: () => void;
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

  consultantDpaLoading: boolean;
  consultantDpaOnFile: boolean;
  consultantDpaChecked: boolean;
  setConsultantDpaChecked: Dispatch<SetStateAction<boolean>>;

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
