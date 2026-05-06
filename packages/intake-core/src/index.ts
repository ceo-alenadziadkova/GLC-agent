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
export { isSoloTeamRaw } from './branch-response-normalizers.js';
export {
  areEarlyBriefCaptureSlotsSatisfied,
  arePreBriefSubmitSlotsSatisfied,
  getEarlyBriefCaptureSubmitSlotIds,
  getPreBriefSubmitSlotIds,
  getVisibleBankStubs,
  isPreBriefSubmitSlotSatisfied,
  resolveBankOptionalIds,
  resolveBankRecommendedIds,
  resolveExpressSlaRequiredIds,
  resolveFullSlaRequiredIds,
  resolvePreBriefSubmitExpressBankIds,
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
  DISCOVERY_FINDINGS_CONFIG,
  type DiscoveryFindingsConfigV1,
  type DiscoveryFindingHook,
} from './discovery-findings-config.js';
export {
  DISCOVERY_FINDINGS_COPY,
  fillDiscoveryFindingTemplate,
  type DiscoveryFindingCopyRow,
} from './discovery-findings-copy.js';
export { DISCOVERY_GLUE_COPY, type DiscoveryGlueCopyV1 } from './discovery-glue-copy.js';
export {
  DISCOVERY_RESULTS_TEASER,
  type DiscoveryResultsTeaserV1,
} from './discovery-results-teaser.js';
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
  isIntakeAnsweredIncludingChoiceSpecify,
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
export { isRevenueAnsweredRaw, INTAKE_REVENUE_BANK_ID } from './intake-revenue.js';
export { computeIntakePlanDerived } from './core/plan-derived.js';
export { buildPublicDiscoveryUiFragment } from './discovery-ui-fragment.js';
export {
  buildDiscoveryQuestionRow,
  buildDiscoveryWizardQuestions,
  PUBLIC_DISCOVERY_WIZARD_BANK_IDS,
} from './discovery-wizard-questions.js';
export { BRIEF_ANSWER_STRING_MAX } from './brief-answer-limits.js';
export {
  BRIEF_QUESTION_UI_SECTION,
  BRIEF_QUESTIONS,
  EXPRESS_REQUIRED_QUESTION_IDS,
  getBriefQuestionText,
  getBriefQuestionsByIds,
  getQuestionsForDomain,
  INTAKE_BRIEF_CONSULTANT_HINTS,
  INTAKE_BRIEF_HIGH_REVENUE_QUESTION_IDS,
  INTAKE_BRIEF_TRIGGERS_FOLLOWUP,
  INTAKE_BRIEF_UI_SECTION_BY_ID,
  INTAKE_IDENTITY_BRIEF_QUESTIONS,
  INTAKE_IDENTITY_FIELD_IDS,
  OPTIONAL_QUESTION_IDS,
  PRE_BRIEF_PARTICIPATION_IDS,
  PRE_BRIEF_QUESTION_IDS,
  PRE_BRIEF_REQUIRED_SUBMIT_IDS,
  RECOMMENDED_QUESTION_IDS,
  REQUIRED_QUESTION_IDS,
} from './intake-brief-catalog-meta.js';
export {
  INTAKE_READINESS_THRESHOLDS,
  readinessBadgeFromProgress,
  type IntakeReadinessBadge,
} from './readiness-badge.js';
export { buildBriefQuestionStemFromBankId } from './bank-question-presentation.js';
export type { BriefQuestionStem } from './bank-question-presentation.js';
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
  appendUniversalIntakeChoiceEscapes,
  INTAKE_UNIVERSAL_CHOICE_DONT_KNOW_FOR_NOW_LABEL,
  INTAKE_UNIVERSAL_CHOICE_OTHER_LABEL,
  isUniversalIntakeDeferChoiceLabel,
} from './intake-universal-choice-escapes.js';
export {
  freeTextImpliesCrmTool,
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
  resolveIntakeNextRecommendedMax,
} from './config/intake-flags.js';
export { INTAKE_UI_CONFIG, type IntakeUiConfig } from './config/intake-ui-config.js';
export {
  INTAKE_DIAGNOSTIC_ANALYTICS_KINDS,
  type IntakeDiagnosticAnalyticsKind,
} from './config/intake-rollout-analytics-kinds.js';
export {
  getIntakeIntelligenceContract,
  getIntakeIntelligenceCoverageSummary,
  getIntakeIntelligenceSprint2CoverageSummary,
  hasIntakeIntelligenceOptionalWithTodo,
  hasIntakeIntelligenceRequiredNow,
  projectIntakeIntelligenceRequiredNow,
  INTAKE_INTELLIGENCE_OPTIONAL_WITH_TODO_FIELDS,
  INTAKE_INTELLIGENCE_P0_IDS,
  INTAKE_INTELLIGENCE_REQUIRED_NOW_FIELDS,
  INTAKE_INTELLIGENCE_BANK_IDS_OUTSIDE_SPRINT2_GATE,
  INTAKE_INTELLIGENCE_SPRINT2_GATE_IDS,
  getIntakeIntelligenceBankIdsOutsideSprint2Gate,
  isValidIntakeIntelligenceTodo,
  isIntakeIntelligenceP0Question,
  isIntakeIntelligenceSprint2GateSatisfied,
  type IntakeIntelligenceContract,
  type IntakeIntelligenceOptionalWithTodoField,
  type IntakeIntelligenceOwnerDomain,
  type IntakeIntelligenceRequiredNowField,
  type IntakeIntelligenceStewardship,
  type IntakeIntelligenceTodo,
} from './config/intake-intelligence-contract.js';
export { MIN_EXPECTED_INFO_GAIN_BITS_SPRINT2 } from './config/intake-intelligence-sprint2.js';
export {
  DEEP_DIVE_CONTEXT_BY_DOMAIN,
  DEEP_DIVE_CONTEXT_CONSTRAINT_QUESTION_IDS,
  DEEP_DIVE_CONTEXT_GOAL_QUESTION_IDS,
  DEEP_DIVE_CONTEXT_TIMEFRAME_QUESTION_IDS,
  getDeepDiveExtractionIdLists,
} from './config/deep-dive-context-extraction.js';
export {
  extractDirectorDeepDiveContextFromBrief,
  type DirectorDeepDiveBriefContext,
} from './core/extract-director-deep-dive-context-from-brief.js';
export { EXPRESS_REQUIRED_ALWAYS_IDS, EXPRESS_REQUIRED_IF_VISIBLE_IDS } from './express-policy-ids.js';
export {
  INTAKE_MINIMUM_CONTEXT_BANK_IDS,
  isIntakeMinimumContextBankId,
} from './intake-base-context-ids.js';
export type {
  AuditReadinessStatus,
  BriefPriority,
  BriefQuestion,
  BriefResponseEntry,
  BriefResponseSource,
  BriefResponseValue,
  BriefRevenueSignal,
  DomainKey,
  DecisionImpact,
  DiagnosticSpineCategory,
  FlowReadinessStatus,
  FollowupPolicy,
  IntakeBriefCollectionMode,
  IntakeCriticalSignalConfidence,
  IntakeReadinessEnvelope,
  IntakeSignalPriorityLevel,
  IntakeSignalPriorityState,
  IntakeSignalSkipPolicy,
  IntakeReadinessTraceEntry,
  IntakeReadinessProgressiveCertaintyTraceCode,
  SignalContribution,
  StopCondition,
  IntakeVersionMigration,
  IntakeVersionTuple,
  ProductMode,
} from './audit-contract.js';
export {
  DIAGNOSTIC_SPINE_CATEGORIES,
  DOMAIN_KEYS,
  INTAKE_READINESS_PROGRESSIVE_CERTAINTY_TRACE_CODES,
} from './audit-contract.js';
export {
  operatorTriageReadinessTraceCodes,
  READINESS_TRACE_CODES_EXCLUDED_FROM_OPERATOR_TRIAGE,
} from './core/readiness-trace-triage.js';
export {
  INTAKE_PLAN_TRACE_COLLECTION_MODE_VALUES,
  INTAKE_PLAN_TRACE_PRODUCT_MODE_VALUES,
  INTAKE_SURFACE_VALUES,
  type IntakePlanTraceCollectionMode,
  type IntakePlanTraceProductMode,
} from './intake-plan-trace-contract.js';
export {
  DOMAIN_DISPLAY_LABELS,
  REPORT_PROFILE_DESCRIPTIONS,
  REPORT_PROFILE_DOMAINS,
  REPORT_PROFILE_LABELS,
  REPORT_PROFILE_MARKDOWN_FOCUS_TITLE,
  REPORT_PROFILES,
  SCORE_COLORS,
  SCORE_LABELS,
  displayDomainLabel,
  scoreBandColorFrom1To5,
  scoreLabelFrom1To5,
  type ReportProfile,
} from './audit-display.js';
export {
  DOMAIN_DISPLAY_I18N_KEYS,
  MARKETING_BRIEF_ROUTE_I18N_KEYS,
  MARKETING_BRIEF_ROUTE_LABELS_EN,
  PUBLIC_DISCOVERY_UI_FRAGMENT_CONTRACT_VERSION,
  REPORT_PROFILE_I18N_KEY_DESCRIPTIONS,
  REPORT_PROFILE_I18N_KEY_LABELS,
  REPORT_PROFILE_MARKDOWN_FOCUS_I18N_KEYS,
  SCORE_LABEL_I18N_KEYS,
  UI_COPY_REGISTRY_VERSION,
} from './ui-copy-registry.js';
export * from './core/index.js';
export { ensureHttpsUrl } from './ensure-https-url.js';
export {
  computeMarketingBriefRecommendedRoute,
  isAllowedMarketingBriefRoute,
  MARKETING_BRIEF_ALLOWED_ROUTES,
  type MarketingBriefPreferredAuditDepth,
  type MarketingBriefPreferredCoveragePackage,
  type MarketingBriefRoute,
  type MarketingBriefRoutingInput,
} from './marketing-brief-routing.js';
export {
  APP_ROUTE_SEGMENTS,
  SPA_MARKETING_BRIEF_PATHS,
  SPA_ROUTE_SEGMENTS,
  type SpaMarketingBriefSegmentKey,
} from './spa-routes.js';
export { DISCOVERY_SOCIAL_PLATFORM_OPTIONS } from './discovery-social-platform-options.js';
export { INTAKE_TRACE_PUBLICATION_LOG_DEFAULT_LIMIT } from './intake-trace-publication-log-limit.js';
export { REVIEW_GATE_NOTES_MAX } from './review-gate-notes-limit.js';
export {
  NO_PUBLIC_WEBSITE_DISPLAY_EN,
  NO_PUBLIC_WEBSITE_DISPLAY_I18N_KEY,
  NO_PUBLIC_WEBSITE_URL,
  auditSkipsPublicWebsiteFetches,
  formatAuditWebsiteDisplay,
  isNoPublicWebsiteUrl,
} from './no-public-website.js';
export {
  C_NOSITE_1_LEGACY_FIRST_PARTY_WEB_LABELS,
  DISCOVERY_BRIEF_PATCH_A5_MULTI_PAGE_SITE,
  DISCOVERY_BRIEF_PATCH_A5_NO_WEBSITE_YET,
  DISCOVERY_BRIEF_PATCH_C3_ANALYTICS_NOT_ON_SITE,
  DISCOVERY_BRIEF_USES_CRM_I18N_KEY_NO,
  DISCOVERY_BRIEF_USES_CRM_I18N_KEY_YES,
  DISCOVERY_BRIEF_USES_CRM_LABEL_EN_NO,
  DISCOVERY_BRIEF_USES_CRM_LABEL_EN_YES,
  DISCOVERY_BRIEF_USES_CRM_NO,
  DISCOVERY_BRIEF_USES_CRM_YES,
  discoveryCnSite1SelectionsImplyFirstPartyWeb,
  formatUsesCrmBriefDisplayEn,
  inferDiscoveryUsesCrm,
  normalizeUsesCrmBriefStoredValue,
  type DiscoveryUsesCrmInference,
  type NormalizedUsesCrmBrief,
} from './discovery-brief-mapping.js';
export {
  ORCHESTRATION_CHANGE_SCENARIOS,
  ORCHESTRATION_MANIFEST_SCHEMA_VERSION,
  ORCHESTRATION_PLAN_HORIZON_ISO,
  ORCHESTRATION_PREVIEW_COMPRESSION_HINTS,
  ORCHESTRATION_PREVIEW_LANE_DENSITY_BANDS,
  ORCHESTRATION_RISK_TOLERANCE_PRESETS,
  ORCHESTRATION_SEASON_PRESETS,
  encodeManifestChangeSignature,
  manifestPlanHorizonKey,
  manifestSignatureArgsFromDraft,
  parseOptionalOrchestrationPlanHorizon,
  type OrchestrationChangeScenario,
  type OrchestrationManifestSchemaVersion,
  type OrchestrationPlanHorizon,
  type OrchestrationPreviewCompressionHint,
  type OrchestrationPreviewLaneDensityBand,
  type OrchestrationRiskTolerancePreset,
  type OrchestrationSeasonPreset,
} from './orchestration-roadmap-manifest.js';
export {
  CANONICAL_NODE_BOARD_IDENTITY_KEY_MAX_CHARS,
  CANONICAL_NODE_KEY_TITLE_MAX_CHARS,
  canonicalNodeKeyFromManifestAndNode,
  canonicalNodeKeyFromParts,
  normalizeBoardIdentityKeyForCanonicalNodeKey,
  normalizeLaneKeyForCanonicalNodeKey,
  normalizeTitleForCanonicalNodeKey,
} from './canonical-node-key.js';
