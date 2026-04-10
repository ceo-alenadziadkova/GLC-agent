export type {
  AiReadinessResult,
  CollectionMode,
  DataQualityResult,
  DataQualityWeights,
  IntakePriority,
  IntakeQuestionStub,
  IntakeResponsesMap,
  IntakeSliceDomain,
  IntakeVisibilityContext,
} from './types.js';
export {
  BRANCH_RULES,
  INDUSTRY_LABEL_TO_BRANCH_SLUG,
  evalBranchCondition,
  normalizeWebsiteGate,
  type BranchPredicate,
  type WebsiteGate,
} from './branch-rules.js';
export {
  getVisibleBankStubs,
  resolveBankOptionalIds,
  resolveBankRecommendedIds,
  resolveExpressSlaRequiredIds,
  resolveFullSlaRequiredIds,
  resolveSlaRequiredIds,
} from './brief-gates.js';
export {
  calcDataQualityScoreFromVisible,
  DEFAULT_DATA_QUALITY_WEIGHTS,
} from './data-quality.js';
export { calcDataQualityScore } from './data-quality-via-plan.js';
export { DISCOVERY_BANK_IDS, isDiscoverySurfaceQuestion } from './discovery.js';
export {
  DOMAIN_TO_QUESTIONS_RAW,
  QUESTION_FEED_ROLES,
  buildDomainToQuestionsRawFromRoles,
  getDomainsForQuestionId,
  isPrimaryFeedForDomain,
  isSecondaryFeedForDomain,
  SLICE_DOMAIN_ORDER,
} from './domain-slice-data.js';
export type { QuestionFeedRoles } from './domain-slice-data.js';
export { calcAiReadinessScore } from './ai-readiness.js';
export {
  DOMAIN_TO_QUESTION_IDS,
  formatSliceForPrompt,
  sliceResponsesForDomain,
} from './domain-slice.js';
export { filterVisibleQuestions, isQuestionVisible } from './is-visible.js';
export {
  buildPlanInputFromVisibilityContext,
  DATA_QUALITY_DEFAULT_PLAN_INPUT,
  filterVisibleQuestionsFromPlan,
} from './visibility-from-plan.js';
export {
  getResponseMultiIncludes,
  getResponseString,
  getResponseStringLower,
  isIntakeAnswered,
  unwrapIntakeValue,
} from './unwrap.js';
export {
  getQuestionBankPromptLabel,
  QUESTION_BANK_V1_IDS,
  QUESTION_BANK_V1_STUBS,
  QUESTION_BANK_VERSION,
  QUESTION_FEEDS_BY_ID,
  responsesUseQuestionBankV1,
  roundDataQualityScore,
} from './question-bank.js';
export { deriveBankV1DataQuality } from './question-bank-derive.js';
export { mergeReconConflictsFromC1, type ReconConflict } from './recon-conflicts.js';
export { prepareBriefForValidation } from './prepare-brief-for-validation.js';
export {
  expandAnswerContractForApi,
  getQuestionBankAnswerContract,
  getQuestionBankReportUse,
  getQuestionBankSchemaMeta,
  intakeStubsFromBankRaw,
  QUESTION_BANK_OPTION_CATALOGS,
} from './question-bank.js';
export { mergeLegacyIntakeAliasesRead, isRevenueAnsweredRaw, INTAKE_REVENUE_BANK_ID } from './legacy-response-aliases.js';
export { computeIntakePlanDerived } from './core/plan-derived.js';
export { buildPublicDiscoveryUiFragment } from './discovery-ui-fragment.js';
export { buildDiscoveryWizardQuestions } from './discovery-wizard-questions.js';
export {
  buildCanonAnswerContractForBankId,
  getBankQuestionUiOptions,
  getBankQuestionUiOverride,
  listBankQuestionUiOverrideIds,
} from './bank-question-ui-overrides.js';
export {
  CHOICE_OPTION_LABELS_REQUIRING_SPECIFY,
  choiceSpecifyResponseKey,
  choiceValueNeedsSpecify,
} from './choice-specify-triggers.js';
export {
  includesCrmTool,
  isA8KnownScale,
  isGovernanceClear,
  normalizeAutomationAttempt,
  normalizeD3ManualLoad,
  normalizeD4aAiUsage,
  normalizeD4bExportReadiness,
  normalizePrimaryGoal,
  normalizeIndustry,
  normalizeOnlinePresence,
  normalizeStage,
  normalizeTeamSize,
  type AutomationAttempt,
  type D3ManualLoad,
  type D4aAiUsage,
  type D4bExportReadiness,
  type GoalBucket,
  type StageBucket,
  type TeamBucket,
} from './answer-normalizers.js';
export {
  isIntakeNextRecommendedEnabled,
  isIntakeIncrementalEngineEnabled,
  isIntakePolicyRichnessEnabled,
} from './config/intake-flags.js';
export { EXPRESS_REQUIRED_ALWAYS_IDS, EXPRESS_REQUIRED_IF_VISIBLE_IDS } from './express-policy-ids.js';
export type {
  BriefQuestion,
  DomainKey,
  IntakeBriefCollectionMode,
  IntakeVersionMigration,
  ProductMode,
} from './audit-contract.js';
export * from './core/index.js';
