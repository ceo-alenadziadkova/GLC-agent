import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useAuth } from '../../hooks/useAuth';
import { useBriefLayoutPrefsSync } from '../../hooks/useBriefLayoutPrefsSync';
import { useIntakeBankMetrics } from '../../hooks/useIntakeWizard';
import { WORKSPACE_PAGE_COPY } from '../../config/workspace-page-copy';
import { NEW_AUDIT_DRAFT_SAVE_DEBOUNCE_MS } from '../../config/ui-feedback-defaults';
import {
  CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE,
  CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE,
  CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY,
  consultantBriefLayoutStorageKey,
  resolveConsultantBriefLayout,
  writeConsultantBriefLayout,
  clearConsultantBriefLayout,
  resolveClientBriefLayout,
  writeClientBriefLayout,
  clearClientBriefLayout,
  CLIENT_BRIEF_LAYOUT_DEFAULT_KEY,
  clientBriefLayoutStorageKey,
} from '../../lib/client-brief-layout-preference';
import {
  readClientPortalNewAuditDraft,
  writeClientPortalNewAuditDraft,
  type ClientPortalNewAuditDraftV1,
} from '../../lib/client-portal-new-audit-draft';
import { api } from '../../data/apiService';
import type { BriefIntakeAnalyticsSurface } from '../../lib/brief-intake-analytics';
import {
  defaultConsultantDisplayName,
} from '../../lib/new-audit-helpers';
import type {
  BriefResponseSource,
  IntakeVersionTuple,
  AuditCoveragePackage,
  DomainKey,
} from '../../data/auditTypes';
import {
  COMPLETE_AUDIT_COVERAGE_PACKAGE,
  INTAKE_BRIEF_SLA_PRODUCT_MODE,
} from '../../data/auditTypes';
import {
  NEW_AUDIT_ALL_COVERAGE_DOMAINS,
  NEW_AUDIT_COVERAGE_PACKAGE_DEPTH,
  NEW_AUDIT_COVERAGE_SELECTION_LIMITS,
  NEW_AUDIT_DEFAULT_DOMAIN_RECOMMENDATIONS,
  NEW_AUDIT_INDUSTRY_DOMAIN_RECOMMENDATIONS,
  NEW_AUDIT_PRO_FALLBACK_SELECTION,
  NEW_AUDIT_STARTER_FALLBACK_DOMAIN,
} from '../../config/new-audit-coverage-policy';
import type { BriefResponses } from '../../data/briefQuestions';
import { computeNewAuditWizardProgress, validateNewAuditStep0Input } from './newAuditValidation';
import { launchNewAudit, saveClientDraft } from './newAuditExecution';
import { useDiscoverySessionPrefill, useIntakeTokenPrefill } from './newAuditPrefill';

export type NewAuditVariant = 'consultant' | 'client_self_serve';

export function useNewAuditWizard(props?: { variant?: NewAuditVariant }) {
  const variant = props?.variant ?? 'consultant';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const intakeTokenFromUrl = searchParams.get('intake')?.trim() ?? '';
  const fromDiscovery = searchParams.get('from_discovery') ?? '';
  const isClientSelfServe = variant === 'client_self_serve';

  const [portalDraftSeed] = useState<ClientPortalNewAuditDraftV1 | null>(() =>
    variant === 'client_self_serve' ? readClientPortalNewAuditDraft() : null,
  );

  // Step 1 fields
  const [url, setUrl] = useState(() => portalDraftSeed?.url ?? '');
  const [noPublicWebsite, setNoPublicWebsite] = useState(() => portalDraftSeed?.noPublicWebsite ?? false);
  const [name, setName] = useState(() => portalDraftSeed?.name ?? '');
  const [industry, setIndustry] = useState(() => portalDraftSeed?.industry ?? '');
  const [industrySpecify, setIndustrySpecify] = useState(() => portalDraftSeed?.industrySpecify ?? '');

  const briefProductMode: 'express' | 'full' = INTAKE_BRIEF_SLA_PRODUCT_MODE as 'express' | 'full';

  const [coveragePackage, setCoveragePackage] = useState<AuditCoveragePackage>(COMPLETE_AUDIT_COVERAGE_PACKAGE);
  const [selectedDomains, setSelectedDomains] = useState<DomainKey[]>([...NEW_AUDIT_ALL_COVERAGE_DOMAINS]);

  const recommendedDomains = useMemo<DomainKey[]>(() => {
    if (!industry) return NEW_AUDIT_DEFAULT_DOMAIN_RECOMMENDATIONS;
    return NEW_AUDIT_INDUSTRY_DOMAIN_RECOMMENDATIONS[industry] ?? NEW_AUDIT_DEFAULT_DOMAIN_RECOMMENDATIONS;
  }, [industry]);

  // Step 2 fields
  const [responses, setResponses] = useState<BriefResponses>(() => portalDraftSeed?.responses ?? {});
  const [intakePrefillActive, setIntakePrefillActive] = useState(false);
  const [discoveryPrefilled, setDiscoveryPrefilled] = useState(false);

  // Pre-brief modal (Step 0)
  const [preBriefOpen, setPreBriefOpen] = useState(false);
  const [preBriefCompany, setPreBriefCompany] = useState('');
  const [preBriefWebsite, setPreBriefWebsite] = useState('');
  const [preBriefIndustryField, setPreBriefIndustryField] = useState('');
  const [preBriefIndustrySpecify, setPreBriefIndustrySpecify] = useState('');
  const [preBriefMessage, setPreBriefMessage] = useState('');
  const [preBriefConsultantName, setPreBriefConsultantName] = useState('');
  const [preBriefExpectedContact, setPreBriefExpectedContact] = useState('');
  const [preBriefContactChannel, setPreBriefContactChannel] = useState('');
  const [preBriefEmail, setPreBriefEmail] = useState('');
  const [preBriefWhatsapp, setPreBriefWhatsapp] = useState('');
  const [preBriefLink, setPreBriefLink] = useState<string | null>(null);
  const [preBriefToken, setPreBriefToken] = useState<string | null>(null);
  const [preBriefLoading, setPreBriefLoading] = useState(false);
  const [preBriefErr, setPreBriefErr] = useState<string | null>(null);

  // Interview mode — consultant fills the brief during a live call
  const [interviewMode, setInterviewMode] = useState(false);

  // Brief layout choice
  const [briefLayoutChoice, setBriefLayoutChoice] = useState<'unset' | 'classic' | 'wizard'>(() => {
    if (isClientSelfServe) {
      const bl = portalDraftSeed?.briefLayoutChoice;
      if (bl === 'classic' || bl === 'wizard') return bl;
      return resolveClientBriefLayout(CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE) ?? 'unset';
    }
    return resolveConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE) ?? 'unset';
  });

  const briefLayoutSyncKeys = useMemo(
    () =>
      isClientSelfServe
        ? [CLIENT_BRIEF_LAYOUT_DEFAULT_KEY, clientBriefLayoutStorageKey(CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE)]
        : [CONSULTANT_BRIEF_LAYOUT_DEFAULT_KEY, consultantBriefLayoutStorageKey(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE)],
    [isClientSelfServe],
  );

  useBriefLayoutPrefsSync(briefLayoutSyncKeys, () => {
    setBriefLayoutChoice(
      isClientSelfServe
        ? (resolveClientBriefLayout(CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE) ?? 'unset')
        : (resolveConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE) ?? 'unset'),
    );
  });

  // UI state
  const [step, setStep] = useState(() => {
    const s = portalDraftSeed?.step ?? 0;
    return s >= 0 && s <= 2 ? s : 0;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Client draft
  const [draftAuditId, setDraftAuditId] = useState<string | null>(() => portalDraftSeed?.draftAuditId ?? null);
  const [draftIntakeVersions, setDraftIntakeVersions] = useState<IntakeVersionTuple | null>(
    () => portalDraftSeed?.draftIntakeVersions ?? null,
  );
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftRestoredVisible, setDraftRestoredVisible] = useState(() => Boolean(portalDraftSeed));

  // Prefill effects (extracted)
  useIntakeTokenPrefill({
    intakeTokenFromUrl,
    isClientSelfServe,
    setResponses,
    setIntakePrefillActive,
    setNoPublicWebsite,
    setUrl,
    setName,
    setIndustry,
    setIndustrySpecify,
  });

  useDiscoverySessionPrefill({
    fromDiscovery,
    setResponses,
    setDiscoveryPrefilled,
    setNoPublicWebsite,
    setIndustry,
  });

  // Fetch intake versions (client self-serve only).
  useEffect(() => {
    if (!isClientSelfServe || !draftAuditId) return;
    let cancelled = false;
    (async () => {
      try {
        const { brief } = await api.getBrief(draftAuditId);
        if (cancelled || !brief?.intake_versions) return;
        setDraftIntakeVersions(brief.intake_versions);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isClientSelfServe, draftAuditId]);

  // Keep selected domains aligned with coverage package.
  useEffect(() => {
    setSelectedDomains(prev => {
      if (coveragePackage === 'complete') return [...NEW_AUDIT_ALL_COVERAGE_DOMAINS] as DomainKey[];
      if (coveragePackage === 'starter') {
        const first: DomainKey = prev[0] ?? NEW_AUDIT_STARTER_FALLBACK_DOMAIN;
        return [first];
      }
      const base: DomainKey[] = prev.length > 0 ? prev.slice(0, 3) : NEW_AUDIT_PRO_FALLBACK_SELECTION;
      return base;
    });
  }, [coveragePackage]);

  // Persist client wizard to sessionStorage.
  useEffect(() => {
    if (!isClientSelfServe) return;
    const t = window.setTimeout(() => {
      writeClientPortalNewAuditDraft({
        v: 1,
        step: step as 0 | 1 | 2,
        url,
        noPublicWebsite,
        name,
        industry,
        industrySpecify,
        productMode: briefProductMode,
        responses,
        briefLayoutChoice,
        draftAuditId,
        draftIntakeVersions,
      });
    }, NEW_AUDIT_DRAFT_SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(t);
  }, [
    isClientSelfServe,
    step,
    url,
    noPublicWebsite,
    name,
    industry,
    industrySpecify,
    briefProductMode,
    responses,
    briefLayoutChoice,
    draftAuditId,
    draftIntakeVersions,
  ]);

  // Validation + progress
  const { step0Valid } = useMemo(
    () =>
      validateNewAuditStep0Input({
        url,
        noPublicWebsite,
        industry,
        industrySpecify,
        selectedDomains,
        coveragePackage,
      }),
    [url, noPublicWebsite, industry, industrySpecify, selectedDomains, coveragePackage],
  );

  const {
    answeredRequired,
    pipelineRequiredTotal,
    step2Complete,
    progressPct,
    readinessBadge,
    nextBestAction,
  } = useMemo(
    () =>
      computeNewAuditWizardProgress({
        responses,
        noPublicWebsite,
        briefProductMode,
      }),
    [responses, noPublicWebsite, briefProductMode],
  );

  const bankMetrics = useIntakeBankMetrics(
    responses,
    noPublicWebsite ? 'discovery' : undefined,
    noPublicWebsite ? undefined : 'consultant_interview',
    briefProductMode,
  );

  const layoutSelected = briefLayoutChoice === 'classic' || briefLayoutChoice === 'wizard';

  const briefWizardIntakeAnalytics = useMemo(():
    | {
        auditId: string;
        surface: BriefIntakeAnalyticsSurface;
        getIntakeVersions: () => IntakeVersionTuple | null;
      }
    | undefined => {
    if (!draftAuditId || noPublicWebsite || briefLayoutChoice !== 'wizard') return undefined;
    const surface: BriefIntakeAnalyticsSurface = isClientSelfServe ? 'client_form' : 'consultant_interview';
    return {
      auditId: draftAuditId,
      surface,
      getIntakeVersions: (): IntakeVersionTuple | null => draftIntakeVersions,
    };
  }, [draftAuditId, noPublicWebsite, briefLayoutChoice, isClientSelfServe, draftIntakeVersions]);

  // Handlers
  function toggleDomainSelection(domain: DomainKey) {
    setSelectedDomains(prev => {
      const has = prev.includes(domain);
      if (coveragePackage === 'complete') return [...NEW_AUDIT_ALL_COVERAGE_DOMAINS] as DomainKey[];
      const next = has ? prev.filter(d => d !== domain) : [...prev, domain];
      if (coveragePackage === 'starter') return next.slice(0, 1) as DomainKey[];
      if (next.length > NEW_AUDIT_COVERAGE_SELECTION_LIMITS.pro.max) {
        return next.slice(0, NEW_AUDIT_COVERAGE_SELECTION_LIMITS.pro.max) as DomainKey[];
      }
      return next as DomainKey[];
    });
  }

  function handleSelectConsultantBriefLayout(mode: 'classic' | 'wizard') {
    if (isClientSelfServe) {
      writeClientBriefLayout(CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE, mode);
    } else {
      writeConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE, mode);
    }
    setBriefLayoutChoice(mode);
  }

  function handleChangeConsultantBriefLayout() {
    if (isClientSelfServe) {
      clearClientBriefLayout(CLIENT_SELF_SERVE_NEW_AUDIT_SCOPE);
    } else {
      clearConsultantBriefLayout(CONSULTANT_NEW_AUDIT_BRIEF_LAYOUT_SCOPE);
    }
    setBriefLayoutChoice('unset');
  }

  function handleResponseChange(id: string, value: string | string[] | number | null) {
    const src: BriefResponseSource = isClientSelfServe ? 'client' : (interviewMode ? 'consultant' : 'client');
    setResponses(prev => ({ ...prev, [id]: { value, source: src } }));
  }

  function handleSetUnknown(id: string) {
    setResponses(prev => ({ ...prev, [id]: { value: null, source: 'unknown' } }));
  }

  function buildExecutionPlan() {
    const depth = NEW_AUDIT_COVERAGE_PACKAGE_DEPTH[coveragePackage];
    return {
      selected_domains: selectedDomains,
      depth,
      source: 'user_selected' as const,
      recommended_domains: recommendedDomains,
      coverage_package: coveragePackage,
      include_strategy: coveragePackage !== 'starter',
    };
  }

  async function handleSaveClientDraft() {
    const executionPlan = buildExecutionPlan();
    await saveClientDraft({
      isClientSelfServe,
      step0Valid,
      step: step as 0 | 1 | 2,
      url,
      noPublicWebsite,
      name,
      industry,
      industrySpecify,
      productMode: briefProductMode,
      responses,
      briefLayoutChoice,
      executionPlan,
      draftAuditId,
      draftIntakeVersions,
      setDraftAuditId,
      setDraftIntakeVersions,
      setDraftNotice,
      setDraftError,
      setDraftSaving,
    });
  }

  function handleLaunch(e: FormEvent) {
    const executionPlan = buildExecutionPlan();
    return launchNewAudit(e, {
      isClientSelfServe,
      url,
      noPublicWebsite,
      name,
      industry,
      industrySpecify,
      productMode: briefProductMode,
      responses,
      briefLayoutChoice,
      executionPlan,
      draftAuditId,
      preBriefToken,
      intakeTokenFromUrl,
      setError,
      setLoading,
      navigate,
      setPreBriefToken,
      setDraftIntakeVersions,
    });
  }

  function closePreBriefModal() {
    setPreBriefOpen(false);
    setPreBriefCompany('');
    setPreBriefWebsite('');
    setPreBriefIndustryField('');
    setPreBriefIndustrySpecify('');
    setPreBriefMessage('');
    setPreBriefConsultantName('');
    setPreBriefExpectedContact('');
    setPreBriefContactChannel('');
    setPreBriefEmail('');
    setPreBriefWhatsapp('');
    setPreBriefLink(null);
    setPreBriefErr(null);
    setPreBriefLoading(false);
  }

  async function handlePreBriefCreate() {
    setPreBriefErr(null);
    setPreBriefLoading(true);
    setPreBriefLink(null);
    try {
      if (preBriefIndustryField === 'Other' && !preBriefIndustrySpecify.trim()) {
        setPreBriefErr(WORKSPACE_PAGE_COPY.newAudit.preBriefIndustryOtherRequired);
        setPreBriefLoading(false);
        return;
      }
      const consultantName = preBriefConsultantName.trim() || defaultConsultantDisplayName(user);
      const { url, token } = await api.createIntakeToken({
        metadata: {
          ...(preBriefCompany.trim() ? { company_name: preBriefCompany.trim() } : {}),
          ...(preBriefWebsite.trim() ? { company_website: preBriefWebsite.trim() } : {}),
          ...(preBriefIndustryField.trim() ? { industry: preBriefIndustryField.trim() } : {}),
          ...(preBriefIndustryField === 'Other' && preBriefIndustrySpecify.trim()
            ? { industry_specify: preBriefIndustrySpecify.trim() }
            : {}),
          ...(preBriefMessage.trim() ? { message: preBriefMessage.trim() } : {}),
          ...(consultantName ? { consultant_name: consultantName } : {}),
          ...(preBriefExpectedContact.trim() ? { expected_contact: preBriefExpectedContact.trim() } : {}),
          ...(preBriefContactChannel.trim() ? { contact_channel: preBriefContactChannel.trim() } : {}),
          ...(preBriefEmail.trim() ? { consultant_email: preBriefEmail.trim() } : {}),
          ...(preBriefWhatsapp.trim() ? { consultant_whatsapp: preBriefWhatsapp.trim() } : {}),
        },
      });
      setPreBriefLink(url);
      setPreBriefToken(token);
    } catch (e) {
      setPreBriefErr((e as Error).message);
    } finally {
      setPreBriefLoading(false);
    }
  }

  return {
    // Props derived
    isClientSelfServe,

    // Query-driven
    intakeTokenFromUrl,
    fromDiscovery,

    // Step & UI feedback
    step,
    setStep,
    loading,
    setLoading,
    error,
    setError,
    step0Valid,
    briefProductMode,

    // Step 0 basics
    url,
    setUrl,
    noPublicWebsite,
    setNoPublicWebsite,
    name,
    setName,
    industry,
    setIndustry,
    industrySpecify,
    setIndustrySpecify,
    coveragePackage,
    setCoveragePackage,
    selectedDomains,
    setSelectedDomains,
    toggleDomainSelection,
    recommendedDomains,

    // Step 1 brief
    responses,
    setResponses,
    intakePrefillActive,
    discoveryPrefilled,
    answeredRequired,
    pipelineRequiredTotal,
    step2Complete,
    progressPct,
    readinessBadge,
    nextBestAction,
    bankMetrics,

    // Layout / gating UI
    briefLayoutChoice,
    setBriefLayoutChoice,
    layoutSelected,
    handleSelectConsultantBriefLayout,
    handleChangeConsultantBriefLayout,
    briefWizardIntakeAnalytics,

    // Interview mode
    interviewMode,
    setInterviewMode,

    // Response handlers
    handleResponseChange,
    handleSetUnknown,

    // Draft state
    draftAuditId,
    draftIntakeVersions,
    setDraftIntakeVersions,
    draftSaving,
    draftNotice,
    setDraftNotice,
    draftError,
    setDraftError,
    setDraftSaving,
    setDraftAuditId,
    draftRestoredVisible,
    setDraftRestoredVisible,

    // Actions
    handleSaveClientDraft,
    handleLaunch,

    // Pre-brief modal
    preBriefOpen,
    setPreBriefOpen,
    preBriefCompany,
    setPreBriefCompany,
    preBriefWebsite,
    setPreBriefWebsite,
    preBriefIndustryField,
    setPreBriefIndustryField,
    preBriefIndustrySpecify,
    setPreBriefIndustrySpecify,
    preBriefMessage,
    setPreBriefMessage,
    preBriefConsultantName,
    setPreBriefConsultantName,
    preBriefExpectedContact,
    setPreBriefExpectedContact,
    preBriefContactChannel,
    setPreBriefContactChannel,
    preBriefEmail,
    setPreBriefEmail,
    preBriefWhatsapp,
    setPreBriefWhatsapp,
    preBriefLink,
    setPreBriefLink,
    preBriefToken,
    setPreBriefToken,
    preBriefLoading,
    setPreBriefLoading,
    preBriefErr,
    setPreBriefErr,
    closePreBriefModal,
    handlePreBriefCreate,
  };
}

