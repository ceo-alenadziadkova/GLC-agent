import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router';
import { ensureHttpsUrl } from '@glc/intake-core';
import type { BriefResponseSource, IntakeVersionTuple } from '../data/auditTypes';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe,
  ArrowRight,
  ArrowLeft,
  Lightning,
  CheckCircle,
  Warning,
  ClipboardText,
  Rocket,
  Circle,
  Copy,
  X,
  FloppyDisk,
  Spinner,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { SectionLabel } from '../components/glc/SectionLabel';
import { useAuth } from '../hooks/useAuth';
import { useBriefLayoutPrefsSync } from '../hooks/useBriefLayoutPrefsSync';
import { useIntakeBankMetrics } from '../hooks/useIntakeWizard';
import { labelsForMissingReportDomains } from '../lib/intake-coverage-domain-labels';
import { IntakeBankCoverageHint } from '../components/IntakeBankCoverageHint';
import { IntakeBankWizard } from '../components/IntakeBankWizard';
import { BankClassicBriefFields } from '../components/BankClassicBriefFields';
import { BriefLayoutPreferenceCards } from '../components/BriefLayoutPreferenceCards';
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
} from '../lib/client-brief-layout-preference';
import { WORKSPACE_PAGE_COPY } from '../config/workspace-page-copy';
import {
  clearClientPortalNewAuditDraft,
  readClientPortalNewAuditDraft,
  writeClientPortalNewAuditDraft,
  type ClientPortalNewAuditDraftV1,
} from '../lib/client-portal-new-audit-draft';
import type { BriefIntakeAnalyticsSurface } from '../lib/brief-intake-analytics';
import {
  buildStep0IntakePatch,
  defaultConsultantDisplayName,
  isSelfServeOwnerConfigApiError,
  NEXT_ACTION_TEXT,
  unwrapBriefString,
  websiteAnswerToAuditUrl,
} from '../lib/new-audit-helpers';
import { DOMAIN_PILLS, StepIndicator } from './new-audit';
import { api, ApiError } from '../data/apiService';
import { getGlcQueryClient } from '../lib/glc-query-client';
import { invalidateAuditRelatedQueries, invalidateAuditsListsAndDashboard } from '../lib/glc-invalidate-queries';
import { INDUSTRY_OPTIONS, isIndustryOption } from '../data/industry-options';
import { applyIntakeMetadataPrefill } from '../lib/intake-client-copy';
import { effectiveBriefForPipelineGates, normalizeIntakeToResponses } from '../data/intakeBriefMap';
import {
  countAnswered,
  mergeBriefResponsesPreferFilled,
  pipelineRequiredIdsForProductMode,
  type BriefResponseEntry,
  type BriefResponses,
} from '../data/briefQuestions';
import { logger } from '../lib/logger';
import { GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY } from '../lib/storage-keys';
import type { DomainKey } from '../data/auditTypes';

const ALL_COVERAGE_DOMAINS: DomainKey[] = [
  'tech_infrastructure',
  'security_compliance',
  'seo_digital',
  'ux_conversion',
  'marketing_utp',
  'automation_processes',
];

const COVERAGE_DOMAIN_LABELS: Record<DomainKey, string> = {
  tech_infrastructure: 'Tech Infrastructure',
  security_compliance: 'Security & Compliance',
  seo_digital: 'SEO & Digital',
  ux_conversion: 'UX & Conversion',
  marketing_utp: 'Marketing & Positioning',
  automation_processes: 'Automation & Processes',
};

const INDUSTRY_DOMAIN_RECOMMENDATIONS: Record<string, DomainKey[]> = {
  'E-commerce': ['ux_conversion', 'seo_digital', 'automation_processes'],
  Hospitality: ['ux_conversion', 'marketing_utp', 'seo_digital'],
  Healthcare: ['security_compliance', 'tech_infrastructure', 'ux_conversion'],
  'SaaS / Technology': ['tech_infrastructure', 'security_compliance', 'automation_processes'],
  'Professional Services': ['marketing_utp', 'ux_conversion', 'automation_processes'],
};

export type NewAuditVariant = 'consultant' | 'client_self_serve';

export function NewAudit(props?: { variant?: NewAuditVariant }) {
  const variant = props?.variant ?? 'consultant';
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const intakeTokenFromUrl = searchParams.get('intake')?.trim() ?? '';
  const fromDiscovery      = searchParams.get('from_discovery') ?? '';
  const isClientSelfServe = variant === 'client_self_serve';

  const [portalDraftSeed] = useState<ClientPortalNewAuditDraftV1 | null>(() =>
    variant === 'client_self_serve' ? readClientPortalNewAuditDraft() : null,
  );

  // Step 1 fields
  const [url,         setUrl]         = useState(() => portalDraftSeed?.url ?? '');
  const [noPublicWebsite, setNoPublicWebsite] = useState(() => portalDraftSeed?.noPublicWebsite ?? false);
  const [name,        setName]        = useState(() => portalDraftSeed?.name ?? '');
  const [industry,    setIndustry]    = useState(() => portalDraftSeed?.industry ?? '');
  /** Free-text sector when industry is Other (synced from client pre-brief when linking ?intake=). */
  const [industrySpecify, setIndustrySpecify] = useState(() => portalDraftSeed?.industrySpecify ?? '');
  const productMode: 'full' = 'full';
  const [coveragePackage, setCoveragePackage] = useState<'starter' | 'pro' | 'complete'>('complete');
  const [selectedDomains, setSelectedDomains] = useState<DomainKey[]>([...ALL_COVERAGE_DOMAINS]);
  const recommendedDomains = useMemo<DomainKey[]>(() => {
    if (!industry) return ['tech_infrastructure', 'ux_conversion'];
    return INDUSTRY_DOMAIN_RECOMMENDATIONS[industry] ?? ['tech_infrastructure', 'ux_conversion'];
  }, [industry]);

  // Step 2 fields
  const [responses, setResponses] = useState<BriefResponses>(() => portalDraftSeed?.responses ?? {});
  const [intakePrefillActive, setIntakePrefillActive] = useState(false);
  /** True when answers were pre-loaded from a public discovery session. */
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
  /** Hex token from last created link — used on launch to merge client answers into the new audit's brief. */
  const [preBriefToken, setPreBriefToken] = useState<string | null>(null);
  const [preBriefLoading, setPreBriefLoading] = useState(false);
  const [preBriefErr, setPreBriefErr] = useState<string | null>(null);

  // Interview mode — consultant fills the brief during a live call
  const [interviewMode, setInterviewMode] = useState(false);

  /** unset until layout resolved (per-session key, then Settings default, else chooser). */
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
  const [step,    setStep]    = useState(() => {
    const s = portalDraftSeed?.step ?? 0;
    return s >= 0 && s <= 2 ? s : 0;
  });
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  /** Server-backed draft audit (client self-serve); reused on Launch to avoid duplicate rows. */
  const [draftAuditId, setDraftAuditId] = useState<string | null>(() => portalDraftSeed?.draftAuditId ?? null);
  const [draftIntakeVersions, setDraftIntakeVersions] = useState<IntakeVersionTuple | null>(
    () => portalDraftSeed?.draftIntakeVersions ?? null,
  );
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftNotice, setDraftNotice] = useState<string | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);
  const [draftRestoredVisible, setDraftRestoredVisible] = useState(() => Boolean(portalDraftSeed));

  useEffect(() => {
    if (isClientSelfServe || !intakeTokenFromUrl) return;
    let cancelled = false;
    (async () => {
      try {
        let data: Awaited<ReturnType<typeof api.getIntakeToken>>;
        try {
          data = await api.getIntakePrefillForConsultant(intakeTokenFromUrl);
        } catch (e) {
          if (e instanceof ApiError) {
            data = await api.getIntakeToken(intakeTokenFromUrl);
          } else {
            throw e;
          }
        }
        if (cancelled) return;

        let merged = normalizeIntakeToResponses(data.responses ?? {});
        merged = applyIntakeMetadataPrefill(merged, data.metadata ?? {});

        // Token / server answers win over empty local state (consultant opened ?intake= prefill).
        setResponses(prev => ({ ...prev, ...merged }));
        setIntakePrefillActive(true);

        const web = unwrapBriefString(merged, 'a11') ?? unwrapBriefString(merged, 'intake_company_website');
        if (web) {
          const auditUrl = websiteAnswerToAuditUrl(web);
          if (auditUrl) {
            setNoPublicWebsite(false);
            setUrl(u => (u.trim() ? u : auditUrl));
          } else {
            setNoPublicWebsite(true);
            setUrl('');
          }
        }

        const cname =
          unwrapBriefString(merged, 'a12')
          ?? unwrapBriefString(merged, 'intake_company_name')
          ?? (typeof data.metadata?.company_name === 'string' ? data.metadata.company_name.trim() : undefined);
        if (cname) {
          setName(n => (n.trim() ? n : cname));
        }

        const ind = unwrapBriefString(merged, 'a2') ?? unwrapBriefString(merged, 'intake_industry');
        if (ind && isIndustryOption(ind)) {
          setIndustry(i => (i ? i : ind));
        }
        if (ind === 'Other') {
          const spec = unwrapBriefString(merged, 'intake_industry_specify');
          setIndustrySpecify(spec ?? '');
        }
      } catch {
        /* invalid or expired token — ignore, user continues fresh */
      }
    })();
    return () => { cancelled = true; };
  }, [intakeTokenFromUrl, isClientSelfServe]);

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

  useEffect(() => {
    setSelectedDomains((prev) => {
      if (coveragePackage === 'complete') return [...ALL_COVERAGE_DOMAINS] as DomainKey[];
      if (coveragePackage === 'starter') {
        const first: DomainKey = prev[0] ?? 'tech_infrastructure';
        return [first];
      }
      const base: DomainKey[] =
        prev.length > 0 ? prev.slice(0, 3) : ['tech_infrastructure', 'security_compliance'];
      return base;
    });
  }, [coveragePackage]);

  // Persist client wizard to sessionStorage (same tab survives refresh).
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
        productMode,
        responses,
        briefLayoutChoice,
        draftAuditId,
        draftIntakeVersions,
      });
    }, 350);
    return () => window.clearTimeout(t);
  }, [
    isClientSelfServe,
    step,
    url,
    noPublicWebsite,
    name,
    industry,
    industrySpecify,
    productMode,
    responses,
    briefLayoutChoice,
    draftAuditId,
    draftIntakeVersions,
  ]);

  // ── Discovery session pre-fill ──────────────────────────────────────────────
  // When the user arrives from /audit/discover via ?from_discovery=1, load the
  // stored discovery session and merge its bank-ID answers into the wizard.
  useEffect(() => {
    if (!fromDiscovery) return;
    const token = localStorage.getItem(GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY);
    if (!token) return;

    let cancelled = false;
    (async () => {
      try {
        const session = await api.getDiscoverySession(token);
        if (cancelled || !session?.answers) return;

        const bankResponses: BriefResponses = {};
        for (const [key, val] of Object.entries(session.answers as Record<string, unknown>)) {
          if (val != null) {
            bankResponses[key] = { value: val as BriefResponseEntry['value'], source: 'client' };
          }
        }
        // Discovery mode always implies no public website
        bankResponses['a5'] = { value: 'No website yet', source: 'client' };

        setResponses(prev => ({ ...prev, ...bankResponses }));
        setNoPublicWebsite(true);

        // Sync Step 1 industry field if a2 was answered
        const a2 = session.answers['a2'] as string | undefined;
        if (a2) setIndustry(a2);

        setDiscoveryPrefilled(true);
        localStorage.removeItem(GLC_DISCOVERY_SESSION_TOKEN_STORAGE_KEY);
      } catch {
        // Non-critical — wizard opens blank if session can't be loaded
      }
    })();
    return () => { cancelled = true; };
  }, [fromDiscovery]);

  // ── Validation ──────────────────────────────────────────
  function isValidUrl(raw: string): boolean {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    try {
      const prefixed = ensureHttpsUrl(trimmed);
      return new URL(prefixed).hostname.includes('.');
    } catch { return false; }
  }

  const step1Valid =
    (noPublicWebsite || isValidUrl(url))
    && (industry !== 'Other' || industrySpecify.trim().length > 0);

  const coverageValid =
    (coveragePackage === 'starter' && selectedDomains.length === 1) ||
    (coveragePackage === 'pro' && selectedDomains.length >= 2 && selectedDomains.length <= 3) ||
    (coveragePackage === 'complete' && selectedDomains.length === ALL_COVERAGE_DOMAINS.length);

  const step0Valid = step1Valid && coverageValid;

  function toggleDomainSelection(domain: DomainKey) {
    setSelectedDomains((prev) => {
      const has = prev.includes(domain);
      if (coveragePackage === 'complete') return [...ALL_COVERAGE_DOMAINS] as DomainKey[];
      const next = has ? prev.filter((d) => d !== domain) : [...prev, domain];
      if (coveragePackage === 'starter') return next.slice(0, 1) as DomainKey[];
      if (next.length > 3) return next.slice(0, 3) as DomainKey[];
      return next as DomainKey[];
    });
  }

  const effectiveBriefForGates = useMemo(
    () => effectiveBriefForPipelineGates(responses),
    [responses],
  );

  const bankCollectionModeForGates = noPublicWebsite ? 'discovery' : undefined;
  const pipelineRequiredIds = useMemo(
    () =>
      pipelineRequiredIdsForProductMode(
        productMode,
        effectiveBriefForGates,
        bankCollectionModeForGates,
      ),
    [productMode, effectiveBriefForGates, bankCollectionModeForGates],
  );
  const answeredRequired = countAnswered(effectiveBriefForGates, [...pipelineRequiredIds]);
  const pipelineRequiredTotal = pipelineRequiredIds.length;
  const step2Complete    = answeredRequired === pipelineRequiredTotal;
  const progressPct = Math.min(100, Math.round((answeredRequired / pipelineRequiredTotal) * 100));
  const readinessBadge: 'low' | 'medium' | 'high' = progressPct >= 80 ? 'high' : progressPct >= 45 ? 'medium' : 'low';
  const nextBestAction = step2Complete ? 'add_recommended' : 'complete_required';
  const bankMetrics = useIntakeBankMetrics(
    responses,
    noPublicWebsite ? 'discovery' : undefined,
    noPublicWebsite ? undefined : 'consultant_interview',
    productMode,
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

  // ── Handlers ───────────────────────────────────────────
  function handleResponseChange(id: string, value: string | string[] | number | null) {
    const src: BriefResponseSource = isClientSelfServe ? 'client' : (interviewMode ? 'consultant' : 'client');
    setResponses(prev => ({ ...prev, [id]: { value, source: src } }));
  }

  function handleSetUnknown(id: string) {
    setResponses(prev => ({ ...prev, [id]: { value: null, source: 'unknown' } }));
  }

  function buildExecutionPlan() {
    const depth: 'light' | 'standard' | 'deep' =
      coveragePackage === 'starter' ? 'light' : coveragePackage === 'pro' ? 'standard' : 'deep';
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
    if (!isClientSelfServe) return;
    setDraftError(null);
    setDraftNotice(null);
    setDraftSaving(true);
    try {
      writeClientPortalNewAuditDraft({
        v: 1,
        step: step as 0 | 1 | 2,
        url,
        noPublicWebsite,
        name,
        industry,
        industrySpecify,
        productMode,
        responses,
        briefLayoutChoice,
        draftAuditId,
        draftIntakeVersions,
      });
      if (!step0Valid) {
        setDraftNotice(WORKSPACE_PAGE_COPY.newAudit.draftNoticeIncomplete);
        return;
      }

      let auditId = draftAuditId;
      if (!auditId) {
        const created = await api.createAudit(url, name || undefined, industry || undefined, productMode, {
          noPublicWebsite,
          executionPlan: buildExecutionPlan(),
        });
        auditId = created.id;
        setDraftAuditId(auditId);
      }

      const basicsSource: BriefResponseSource = 'client';
      const localWithBasics: BriefResponses = {
        ...responses,
        ...buildStep0IntakePatch(name, industry, industrySpecify, url, noPublicWebsite, basicsSource),
      };
      if (industry !== 'Other') {
        delete localWithBasics.intake_industry_specify;
      }

      const savePayload = await api.saveBrief(auditId, localWithBasics, {
        collection_mode:
          noPublicWebsite && briefLayoutChoice === 'wizard' ? 'discovery' : undefined,
      });
      setDraftIntakeVersions(savePayload.brief.intake_versions ?? null);

      writeClientPortalNewAuditDraft({
        v: 1,
        step: step as 0 | 1 | 2,
        url,
        noPublicWebsite,
        name,
        industry,
        industrySpecify,
        productMode,
        responses,
        briefLayoutChoice,
        draftAuditId: auditId,
        draftIntakeVersions: savePayload.brief.intake_versions ?? null,
      });

      setDraftNotice(
        WORKSPACE_PAGE_COPY.newAudit.draftSavedAccountAndBrowser,
      );
    } catch (err) {
      if (isSelfServeOwnerConfigApiError(err)) {
        setDraftNotice(
          WORKSPACE_PAGE_COPY.newAudit.draftSavedLocalSyncFailed,
        );
      } else {
        setDraftError(err instanceof ApiError ? err.message : (err as Error).message);
      }
    } finally {
      setDraftSaving(false);
    }
  }

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const basicsSource: BriefResponseSource = isClientSelfServe ? 'client' : 'consultant';
      const localWithBasics: BriefResponses = {
        ...responses,
        ...buildStep0IntakePatch(name, industry, industrySpecify, url, noPublicWebsite, basicsSource),
      };
      if (industry !== 'Other') {
        delete localWithBasics.intake_industry_specify;
      }

      // 1. Create audit (or reuse client draft saved earlier)
      let auditId: string;
      if (isClientSelfServe && draftAuditId) {
        auditId = draftAuditId;
      } else {
        const audit = await api.createAudit(url, name || undefined, industry || undefined, productMode, {
          noPublicWebsite,
          executionPlan: buildExecutionPlan(),
        });
        auditId = audit.id;
      }

      // 2. Link any pre-brief tokens (modal link or ?intake= URL) so client answers merge into intake_brief
      const tokenCandidates = isClientSelfServe
        ? ([] as string[])
        : ([...new Set([preBriefToken, intakeTokenFromUrl].filter(Boolean))] as string[]);
      for (const t of tokenCandidates) {
        try {
          await api.linkIntakeTokenToAudit(t, auditId);
        } catch (linkErr) {
          logger.warn('[NewAudit] linkIntakeTokenToAudit failed (non-fatal)', {
            error: linkErr instanceof Error ? linkErr.message : String(linkErr),
          });
        }
      }

      let mergedForSave = localWithBasics;
      let intakeVersionsForSave: IntakeVersionTuple | undefined;
      if (tokenCandidates.length > 0) {
        try {
          const { brief } = await api.getBrief(auditId);
          const fromServer = normalizeIntakeToResponses((brief?.responses as Record<string, unknown>) ?? {});
          mergedForSave = mergeBriefResponsesPreferFilled(fromServer, localWithBasics);
          intakeVersionsForSave = brief?.intake_versions ?? undefined;
        } catch (mergeErr) {
          logger.warn('[NewAudit] getBrief merge failed (non-fatal)', {
            error: mergeErr instanceof Error ? mergeErr.message : String(mergeErr),
          });
        }
      }

      try {
        await api.saveBrief(auditId, mergedForSave, {
          collection_mode:
            noPublicWebsite && briefLayoutChoice === 'wizard' ? 'discovery' : undefined,
          intake_versions: intakeVersionsForSave,
        });
      } catch (briefErr) {
        logger.warn('[NewAudit] Brief save failed (non-fatal)', {
          error: briefErr instanceof Error ? briefErr.message : String(briefErr),
        });
      }

      await api.startPipeline(auditId);
      const qc = getGlcQueryClient();
      invalidateAuditRelatedQueries(qc, auditId);
      invalidateAuditsListsAndDashboard(qc);
      setPreBriefToken(null);

      if (isClientSelfServe) {
        clearClientPortalNewAuditDraft();
        setDraftIntakeVersions(null);
      }

      navigate(isClientSelfServe ? `/portal/pipeline/${auditId}` : `/pipeline/${auditId}`);
    } catch (err) {
      if (isClientSelfServe && isSelfServeOwnerConfigApiError(err)) {
        setError(
          WORKSPACE_PAGE_COPY.newAudit.startAuditFailed,
        );
      } else {
        setError(err instanceof ApiError ? err.message : (err as Error).message);
      }
      setLoading(false);
    }
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

  const clientDraftSaveSection = isClientSelfServe ? (
    <div className="mt-5 pt-5 space-y-3" style={{ borderTop: '1px solid var(--border-subtle)' }}>
      {draftError && (
        <div
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--callout-error-bg)', border: '1px solid var(--callout-error-border)', color: 'var(--score-1)' }}
        >
          <Warning className="w-3.5 h-3.5 flex-shrink-0" />
          {draftError}
        </div>
      )}
      {draftNotice && !draftError && (
        <div
          className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'rgba(14,207,130,0.08)', color: 'var(--glc-green-dark)' }}
        >
          <CheckCircle weight="fill" className="w-3.5 h-3.5 flex-shrink-0" />
          {draftNotice}
        </div>
      )}
      <button
        type="button"
        disabled={draftSaving}
        onClick={() => {
          void handleSaveClientDraft();
        }}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all"
        style={{
          border: '1px solid var(--border-default)',
          backgroundColor: 'var(--bg-surface)',
          color: 'var(--text-primary)',
          cursor: draftSaving ? 'wait' : 'pointer',
        }}
      >
        {draftSaving ? (
          <Spinner className="w-4 h-4 animate-spin" style={{ color: 'var(--glc-blue)' }} />
        ) : (
          <FloppyDisk className="w-4 h-4" style={{ color: 'var(--glc-blue)' }} />
        )}
        Save draft
      </button>
      <p className="text-xs m-0 leading-relaxed text-center" style={{ color: 'var(--text-quaternary)' }}>
        This tab keeps a copy as you type. Save draft also writes to your account when Basics are valid, so you can
        continue from My Portal.
      </p>
    </div>
  ) : null;

  // ── Render ─────────────────────────────────────────────
  return (
    <AppShell
      title={isClientSelfServe ? 'New audit' : 'New Audit'}
      subtitle={
        isClientSelfServe
          ? WORKSPACE_PAGE_COPY.newAudit.appShellSubtitleClient
          : WORKSPACE_PAGE_COPY.newAudit.appShellSubtitleConsultant
      }
      actions={
        isClientSelfServe ? (
          <Link
            to="/portal"
            className="hidden sm:inline text-sm no-underline"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Back to portal
          </Link>
        ) : undefined
      }
    >
      <div
        className="min-h-full flex flex-col items-center justify-center py-8 mobile:py-6 glc-page-content relative"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--mesh-brand)', opacity: 0.55 }} />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className={`relative w-full max-w-full ${step === 1 ? 'sm:max-w-[40rem]' : 'sm:max-w-[28.75rem]'}`}
        >
          {isClientSelfServe && (
            <Link
              to="/portal"
              className="sm:hidden inline-flex items-center gap-1.5 text-sm font-medium no-underline glc-touch-target mb-4"
              style={{ color: 'var(--glc-blue)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to portal
            </Link>
          )}
          <StepIndicator current={step} />

          {isClientSelfServe && draftRestoredVisible && (
            <div
              className="mb-5 flex items-start gap-3 px-4 py-3 rounded-xl"
              style={{
                backgroundColor: 'var(--callout-info-bg)',
                border: '1px solid var(--callout-info-border)',
              }}
            >
              <ClipboardText className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--glc-blue)' }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium m-0" style={{ color: 'var(--text-primary)' }}>
                  Draft restored
                </p>
                <p className="text-xs m-0 mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  We loaded your in-progress answers from this browser tab. Refresh-safe copy is kept automatically; use
                  Save draft to also store on your account when Basics are complete.
                </p>
              </div>
              <button
                type="button"
                className="p-1 rounded-md flex-shrink-0"
                style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}
                aria-label="Dismiss"
                onClick={() => setDraftRestoredVisible(false)}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <AnimatePresence mode="sync">

            {/* ── Step 0: Basics ───────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.28 }}
              >
                {/* Header */}
                <div className="text-center mb-6 mobile:mb-5 sm:mb-8">
                  <SectionLabel accent>GLC Audit Platform</SectionLabel>
                  <h1
                    className="mt-2 text-2xl sm:text-[length:var(--text-3xl)]"
                    style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 'var(--tracking-tight)' }}
                  >
                    Start a New Audit
                  </h1>
                  <p className="mt-2.5 px-1" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    Enter a public website if there is one, or indicate there is no site — we still analyze{' '}
                    <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>8 business domains</strong> using your brief and available signals.
                  </p>
                </div>

                {/* Domain pills */}
                <motion.div className="flex flex-wrap gap-1.5 justify-center mb-7" initial="hidden" animate="visible" variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.045 } } }}>
                  {DOMAIN_PILLS.map(({ icon: I, label, color }) => (
                    <motion.span key={label} variants={{ hidden: { opacity: 0, scale: 0.85 }, visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } } }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-medium"
                      style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)', fontSize: '11px' }}
                    >
                      <I className="w-3 h-3" style={{ color }} />{label}
                    </motion.span>
                  ))}
                </motion.div>

                {/* Form */}
                <form onSubmit={e => { e.preventDefault(); if (step0Valid) setStep(1); }} className="glc-card p-4 mobile:p-5 sm:p-6 space-y-5" style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}>
                  {/* URL */}
                  <div className="space-y-1.5">
                    <label htmlFor="url" className="block font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      Company Website{' '}
                      {!noPublicWebsite ? (
                        <span style={{ color: 'var(--glc-orange)' }}>*</span>
                      ) : (
                        <span className="font-normal" style={{ color: 'var(--text-quaternary)', fontSize: '11px' }}>skipped</span>
                      )}
                    </label>
                    <div
                      className="flex items-center overflow-hidden"
                      style={{
                        borderRadius: 'var(--radius-lg)',
                        border: noPublicWebsite ? '1px solid var(--border-subtle)' : url ? '1px solid var(--glc-blue)' : '1px solid var(--border-default)',
                        boxShadow: !noPublicWebsite && url ? 'var(--shadow-blue)' : 'none',
                        backgroundColor: 'var(--bg-surface)',
                        opacity: noPublicWebsite ? 0.65 : 1,
                        transition: 'border-color var(--ease-fast)',
                      }}
                    >
                      <div className="flex items-center justify-center px-3 self-stretch flex-shrink-0" style={{ borderRight: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-inset)', minWidth: 44 }}>
                        <Globe className="w-4 h-4" style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <input
                        id="url"
                        type="text"
                        inputMode="url"
                        autoCapitalize="none"
                        autoCorrect="off"
                        value={url}
                        onChange={e => {
                          setNoPublicWebsite(false);
                          setUrl(e.target.value);
                        }}
                        placeholder="company.com"
                        required={!noPublicWebsite}
                        disabled={noPublicWebsite}
                        autoFocus
                        className="flex-1 px-4 py-3 bg-transparent outline-none disabled:cursor-not-allowed"
                        style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer select-none" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                      <input
                        type="checkbox"
                        checked={noPublicWebsite}
                        onChange={e => {
                          const on = e.target.checked;
                          setNoPublicWebsite(on);
                          if (on) setUrl('');
                        }}
                        className="rounded border-[var(--border-default)]"
                        style={{ accentColor: 'var(--glc-blue)' }}
                      />
                      No public website (audit uses intake brief only for site-specific signals)
                    </label>
                  </div>

                  {/* Name */}
                  <div className="space-y-1.5">
                    <label htmlFor="cname" className="flex items-center gap-2 font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      Company Name <span className="font-normal" style={{ color: 'var(--text-quaternary)', fontSize: '11px' }}>optional</span>
                    </label>
                    <input id="cname" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Hotel XYZ"
                      className="w-full px-4 py-3 bg-transparent outline-none"
                      style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--glc-blue)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; }}
                    />
                  </div>

                  {/* Industry */}
                  <div className="space-y-1.5">
                    <label htmlFor="industry" className="flex items-center gap-2 font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                      Industry <span className="font-normal" style={{ color: 'var(--text-quaternary)', fontSize: '11px' }}>tailors recommendations</span>
                    </label>
                    <select
                      id="industry"
                      value={industry}
                      onChange={e => {
                        const v = e.target.value;
                        setIndustry(v);
                        if (v !== 'Other') {
                          setIndustrySpecify('');
                          setResponses(prev => {
                            const next = { ...prev };
                            delete next.intake_industry_specify;
                            return next;
                          });
                        }
                      }}
                      className="w-full px-4 py-3 outline-none appearance-none"
                      style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: industry ? 'var(--text-primary)' : 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}
                      onFocus={e => { e.target.style.borderColor = 'var(--glc-blue)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; }}
                    >
                      <option value="">Select industry...</option>
                      {INDUSTRY_OPTIONS.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                    {industry === 'Other' && (
                      <div className="space-y-1 pt-1">
                        <label htmlFor="industry-specify" className="block font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
                          Which industry or sector? <span style={{ color: 'var(--glc-orange)' }}>*</span>
                        </label>
                        <input
                          id="industry-specify"
                          type="text"
                          value={industrySpecify}
                          onChange={e => {
                            const t = e.target.value;
                            setIndustrySpecify(t);
                            setResponses(prev => {
                              const next = { ...prev };
                              const trimmed = t.trim();
                              if (trimmed) {
                                next.intake_industry_specify = { value: t, source: 'client' };
                              } else {
                                delete next.intake_industry_specify;
                              }
                              return next;
                            });
                          }}
                          placeholder="e.g. niche manufacturing, creator economy"
                          className="w-full px-4 py-3 bg-transparent outline-none"
                          style={{ borderRadius: 'var(--radius-lg)', border: '1px solid var(--border-default)', backgroundColor: 'var(--bg-surface)', color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}
                          onFocus={e => { e.target.style.borderColor = 'var(--glc-blue)'; }} onBlur={e => { e.target.style.borderColor = 'var(--border-default)'; }}
                        />
                        <p className="text-xs m-0" style={{ color: 'var(--text-tertiary)' }}>
                          Required when &quot;Other&quot; is selected — matches the client pre-brief.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Coverage selection */}
                  <div className="space-y-2">
                    <label className="block font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Coverage package</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['starter', 'pro', 'complete'] as const).map(pkg => {
                        const sel = coveragePackage === pkg;
                        return (
                          <button key={pkg} type="button" onClick={() => setCoveragePackage(pkg)}
                            className="rounded-lg px-3 py-2.5 text-left text-xs transition-all"
                            style={{ backgroundColor: sel ? 'var(--callout-info-bg)' : 'var(--bg-inset)', border: sel ? '1px solid var(--callout-info-border-strong)' : '1px solid var(--border-subtle)' }}
                          >
                            <div className="font-semibold" style={{ color: sel ? 'var(--glc-blue-deeper)' : 'var(--text-primary)' }}>
                              {pkg === 'starter' ? 'Starter' : pkg === 'pro' ? 'Pro' : 'Complete'}
                            </div>
                            <div style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>
                              {pkg === 'starter' ? '1 domain' : pkg === 'pro' ? '2-3 domains' : 'All domains'}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                      {ALL_COVERAGE_DOMAINS.map((domain) => {
                        const checked = selectedDomains.includes(domain);
                        const disabled =
                          coveragePackage === 'complete' ||
                          (coveragePackage === 'starter' && checked && selectedDomains.length === 1) ||
                          (coveragePackage === 'pro' && !checked && selectedDomains.length >= 3);
                        return (
                          <label
                            key={domain}
                            className="flex items-center gap-2 cursor-pointer rounded-lg px-3 py-2"
                            style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-inset)' }}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={disabled}
                              onChange={() => toggleDomainSelection(domain)}
                              style={{ accentColor: 'var(--glc-blue)' }}
                            />
                            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                              {COVERAGE_DOMAIN_LABELS[domain]}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginTop: 6 }}>
                      Recommended from intake context: {recommendedDomains.map((d) => COVERAGE_DOMAIN_LABELS[d]).join(', ')}.
                      Final selection is always yours.
                    </p>
                  </div>

                  <div className="glc-divider" />

                  <motion.button type="submit" disabled={!step0Valid}
                    whileHover={step0Valid ? { scale: 1.015 } : {}} whileTap={step0Valid ? { scale: 0.985 } : {}}
                    className="w-full flex items-center justify-center gap-2 py-3 font-semibold"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      background: step0Valid ? 'var(--gradient-brand)' : 'var(--bg-muted)',
                      color: step0Valid ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                      cursor: step0Valid ? 'pointer' : 'not-allowed',
                      fontSize: 'var(--text-sm)',
                      border: step0Valid ? 'none' : '1px solid var(--border-subtle)',
                      boxShadow: step0Valid ? '0 4px 14px rgba(28,189,255,0.28)' : 'none',
                    }}
                  >
                    Continue to Brief <ArrowRight className="w-4 h-4" />
                  </motion.button>

                  {clientDraftSaveSection}

                  {!isClientSelfServe && (
                    <>
                  {/* Interview mode toggle */}
                  <label
                    className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg px-3 py-2.5 transition-all"
                    style={{
                      border: interviewMode ? '1px solid var(--callout-warning-border-focus)' : '1px solid var(--border-subtle)',
                      background: interviewMode ? 'var(--callout-warning-bg-subtle)' : 'var(--bg-inset)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={interviewMode}
                      onChange={e => setInterviewMode(e.target.checked)}
                      className="rounded"
                      style={{ accentColor: 'var(--callout-warning-icon)', width: 15, height: 15, flexShrink: 0 }}
                    />
                    <div>
                      <span className="text-sm font-medium" style={{ color: interviewMode ? 'var(--callout-warning-fg-emphasis)' : 'var(--text-primary)' }}>
                        Interview mode
                      </span>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {interviewMode
                          ? WORKSPACE_PAGE_COPY.newAudit.interviewModeHintOn
                          : WORKSPACE_PAGE_COPY.newAudit.interviewModeHintOff}
                      </p>
                    </div>
                  </label>

                  <button
                    type="button"
                    className="w-full text-center text-sm pt-2"
                    style={{ color: 'var(--glc-blue)', background: 'none', border: 'none', cursor: 'pointer' }}
                    onClick={() => {
                      setPreBriefOpen(true);
                      setPreBriefLink(null);
                      setPreBriefErr(null);
                    }}
                  >
                    Send pre-brief to client
                  </button>
                    </>
                  )}
                </form>

                {!isClientSelfServe && preBriefOpen && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.55)' }}
                    onClick={closePreBriefModal}
                    onKeyDown={(e) => { if (e.key === 'Escape') closePreBriefModal(); }}
                    role="presentation"
                  >
                    <div
                      className="glc-card p-4 mobile:p-5 sm:p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
                      style={{ borderRadius: 'var(--radius-xl)' }}
                      onClick={e => e.stopPropagation()}
                      role="dialog"
                      aria-modal="true"
                      aria-labelledby="prebrief-title"
                    >
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <h3 id="prebrief-title" className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Send pre-brief link</h3>
                        <button type="button" aria-label="Close" onClick={closePreBriefModal} style={{ color: 'var(--text-tertiary)', background: 'none', border: 'none', cursor: 'pointer' }}>
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                      <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>Optional context for your client. They complete a short pre-brief on a page without logging in. You can pre-fill company name, website, and industry below; they can change any field. After submit they see when and how you will follow up. When you create the audit and launch the pipeline from this browser, their answers sync into that audit&apos;s brief automatically.</p>
                      <div className="space-y-3 mb-4">
                        <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-quaternary)' }}>Pre-fill on client form (optional)</p>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Company name</label>
                          <input value={preBriefCompany} onChange={e => setPreBriefCompany(e.target.value)} placeholder="Shown on their page; they can edit" className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Company website</label>
                          <input value={preBriefWebsite} onChange={e => setPreBriefWebsite(e.target.value)} placeholder="company.com or leave empty for client" className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Industry</label>
                          <select
                            value={preBriefIndustryField}
                            onChange={e => {
                              const v = e.target.value;
                              setPreBriefIndustryField(v);
                              if (v !== 'Other') setPreBriefIndustrySpecify('');
                            }}
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: preBriefIndustryField ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
                          >
                            <option value="">Client chooses…</option>
                            {INDUSTRY_OPTIONS.map(i => (
                              <option key={i} value={i}>{i}</option>
                            ))}
                          </select>
                        </div>
                        {preBriefIndustryField === 'Other' && (
                          <div>
                            <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>
                              Which industry or sector? <span style={{ color: 'var(--glc-orange)' }}>*</span>
                            </label>
                            <input
                              value={preBriefIndustrySpecify}
                              onChange={e => setPreBriefIndustrySpecify(e.target.value)}
                              placeholder="e.g. niche manufacturing"
                              className="w-full px-3 py-2 rounded-lg text-sm"
                              style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                            />
                          </div>
                        )}
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Message (optional)</label>
                          <textarea value={preBriefMessage} onChange={e => setPreBriefMessage(e.target.value)} rows={2} className="w-full px-3 py-2 rounded-lg text-sm resize-none" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Your name (shown to client)</label>
                          <input
                            value={preBriefConsultantName}
                            onChange={e => setPreBriefConsultantName(e.target.value)}
                            placeholder={defaultConsultantDisplayName(user) || 'Consultant name'}
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>When you will follow up (optional)</label>
                          <input
                            value={preBriefExpectedContact}
                            onChange={e => setPreBriefExpectedContact(e.target.value)}
                            placeholder="e.g. 24 hours, Friday, before Thursday's call"
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Channel (optional)</label>
                          <input
                            value={preBriefContactChannel}
                            onChange={e => setPreBriefContactChannel(e.target.value)}
                            placeholder="e.g. WhatsApp, phone call, email"
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>Your email for client questions (optional)</label>
                          <input
                            type="email"
                            value={preBriefEmail}
                            onChange={e => setPreBriefEmail(e.target.value)}
                            placeholder="you@company.com"
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                          />
                        </div>
                        <div>
                          <label className="block text-xs mb-1" style={{ color: 'var(--text-tertiary)' }}>WhatsApp number (optional)</label>
                          <input
                            value={preBriefWhatsapp}
                            onChange={e => setPreBriefWhatsapp(e.target.value)}
                            placeholder="+1 …"
                            className="w-full px-3 py-2 rounded-lg text-sm"
                            style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
                      {preBriefErr && <p className="text-sm mb-2" style={{ color: 'var(--score-1)' }}>{preBriefErr}</p>}
                      {preBriefLink ? (
                        <div className="space-y-2">
                          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Share this link:</p>
                          <div className="flex gap-2">
                            <input readOnly value={preBriefLink} className="flex-1 px-2 py-1.5 rounded text-xs" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-inset)', color: 'var(--text-primary)' }} />
                            <button type="button" className="px-2 py-1.5 rounded-lg text-xs" style={{ border: '1px solid var(--border-subtle)', background: 'var(--bg-surface)', cursor: 'pointer' }} onClick={() => { void navigator.clipboard.writeText(preBriefLink); }}>
                              <Copy className="w-4 h-4" />
                            </button>
                          </div>
                          <button type="button" className="text-sm mt-2" style={{ color: 'var(--glc-blue)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={closePreBriefModal}>Done</button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={preBriefLoading}
                          className="w-full py-2.5 rounded-lg text-sm font-semibold"
                          style={{ background: 'var(--gradient-brand)', color: 'var(--primary-foreground)', border: 'none', cursor: preBriefLoading ? 'wait' : 'pointer' }}
                          onClick={() => { void handlePreBriefCreate(); }}
                        >
                          {preBriefLoading ? 'Creating…' : 'Create link'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 1: Brief ─────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.28 }}
                className="glc-card p-4 mobile:p-5 sm:p-6"
                style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>Intake Brief</h2>
                    {interviewMode && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: 'var(--callout-warning-bg-strong)', border: '1px solid var(--callout-warning-border-strong)', color: 'var(--callout-warning-fg-emphasis)' }}
                      >
                        Interview
                      </span>
                    )}
                  </div>
                  {layoutSelected && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleChangeConsultantBriefLayout}
                        className="text-xs font-medium underline-offset-2 hover:underline"
                        style={{ color: 'var(--glc-blue)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      >
                        Change layout
                      </button>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                        {answeredRequired} / {pipelineRequiredTotal} required
                      </span>
                    </div>
                  )}
                </div>

                <p className="text-xs leading-relaxed mb-3" style={{ color: 'var(--text-quaternary)' }}>
                  Set your default intake layout anytime in{' '}
                  <Link
                    to="/settings#brief-layout"
                    className="font-medium underline-offset-2 hover:underline"
                    style={{ color: 'var(--glc-blue)' }}
                  >
                    Settings
                  </Link>
                  . The layout you pick here overrides that default for this new-audit flow until you use Change layout.
                </p>

                {!layoutSelected && (
                  <BriefLayoutPreferenceCards
                    selected={null}
                    onSelect={handleSelectConsultantBriefLayout}
                  />
                )}

                {layoutSelected && (
                  <>
                    {/* Discovery pre-fill banner */}
                    {discoveryPrefilled && (
                      <div
                        className="flex items-start gap-2.5 rounded-xl px-3.5 py-2.5 mb-4"
                        style={{ background: 'var(--callout-info-bg)', border: '1px solid var(--callout-info-border)' }}
                      >
                        <CheckCircle size={15} weight="fill" className="flex-shrink-0 mt-0.5" style={{ color: 'var(--glc-blue)' }} />
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                          Your discovery answers are pre-filled — review and continue.
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between mb-3">
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-secondary)' }}>Audit readiness: {progressPct}%</span>
                      <span className="px-2 py-0.5 rounded text-xs" style={{ border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                        {readinessBadge.toUpperCase()}
                      </span>
                    </div>
                    <div className="mb-3">
                      <IntakeBankCoverageHint
                        dataQualityPct={bankMetrics.dataQualityPct}
                        visibleRequiredAnswered={bankMetrics.visibleRequiredAnswered}
                        visibleRequiredTotal={bankMetrics.visibleRequiredTotal}
                        visibleRecommendedAnswered={bankMetrics.visibleRecommendedAnswered}
                        visibleRecommendedTotal={bankMetrics.visibleRecommendedTotal}
                        reportInputGapLabels={labelsForMissingReportDomains(bankMetrics.missingForReport)}
                      />
                    </div>
                    {interviewMode && (
                      <div className="mb-3 flex items-start gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--callout-warning-bg)', border: '1px solid var(--callout-warning-border)', color: 'var(--callout-warning-fg)' }}>
                        <span style={{ flexShrink: 0, marginTop: 1 }}>&#9679;</span>
                        <span>
                          Coaching hints visible. Answers are tagged <strong>consultant</strong> — agents weight them as high-confidence.
                          Client answers from pre-brief are tagged <strong>client</strong> and shown in blue.
                        </span>
                      </div>
                    )}
                    {intakePrefillActive && (
                      <div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--callout-info-bg)', border: '1px solid var(--callout-info-border)', color: 'var(--text-secondary)' }}>
                        Pre-filled from client&apos;s pre-brief answers. Review before launch.
                      </div>
                    )}
                    <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 20 }}>
                      These questions feed directly into the AI agents.{' '}
                      <strong className="inline-flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                        <Circle size={7} weight="fill" style={{ color: 'var(--score-1)' }} />
                        Required
                      </strong>{' '}
                      questions must be answered to start the pipeline.
                    </p>

                    <div className="rounded-full overflow-hidden mb-6" style={{ height: 3, backgroundColor: 'var(--bg-muted)' }}>
                      <div className="h-full rounded-full transition-all" style={{ width: `${(answeredRequired / pipelineRequiredTotal) * 100}%`, background: 'var(--gradient-brand)' }} />
                    </div>
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 14 }}>
                      {NEXT_ACTION_TEXT[nextBestAction]}
                    </p>

                    {briefLayoutChoice === 'wizard' ? (
                      <div className="max-h-[min(55vh,28rem)] sm:max-h-[55vh] overflow-y-auto pr-1">
                        <IntakeBankWizard
                          responses={responses}
                          onResponsesChange={next => setResponses(next)}
                          interviewMode={interviewMode}
                          emphasizeClientSource={intakePrefillActive}
                          answerSource={interviewMode ? 'consultant' : 'client'}
                          collectionMode={noPublicWebsite ? 'discovery' : undefined}
                          intakeSurface={noPublicWebsite ? undefined : 'consultant_interview'}
                          intakeAnalytics={briefWizardIntakeAnalytics}
                          productMode={productMode}
                        />
                      </div>
                    ) : (
                      <div className="max-h-[min(55vh,28rem)] sm:max-h-[55vh] overflow-y-auto pr-1">
                        <BankClassicBriefFields
                          responses={responses}
                          collectionMode={noPublicWebsite ? 'discovery' : undefined}
                          intakeSurface={noPublicWebsite ? undefined : 'consultant_interview'}
                          productMode={productMode}
                          onChange={handleResponseChange}
                          onSetUnknown={handleSetUnknown}
                          emphasizeClientSource={intakePrefillActive}
                          interviewMode={interviewMode}
                        />
                      </div>
                    )}
                  </>
                )}

                <div className="glc-divider mt-5" />

                {/* Navigation */}
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3 mt-4">
                  <button type="button" onClick={() => setStep(0)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm glc-touch-target sm:min-h-0 sm:min-w-0"
                    style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', backgroundColor: 'transparent' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button type="button" onClick={() => setStep(2)} disabled={!step2Complete}
                    className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-lg text-sm font-semibold transition-all glc-touch-target sm:min-h-0"
                    style={{
                      background: step2Complete ? 'var(--gradient-brand)' : 'var(--bg-muted)',
                      color: step2Complete ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                      cursor: step2Complete ? 'pointer' : 'not-allowed',
                      border: step2Complete ? 'none' : '1px solid var(--border-subtle)',
                      boxShadow: step2Complete ? '0 4px 14px rgba(28,189,255,0.25)' : 'none',
                    }}
                  >
                    {step2Complete
                      ? <><CheckCircle className="w-4 h-4" /> Review & Launch</>
                      : <><Warning className="w-4 h-4" /> Fill {pipelineRequiredTotal - answeredRequired} more required</>}
                  </button>
                </div>

                {clientDraftSaveSection}
              </motion.div>
            )}

            {/* ── Step 2: Confirm ───────────────────────── */}
            {step === 2 && (
              <motion.form
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.28 }}
                onSubmit={handleLaunch}
                className="glc-card p-4 mobile:p-5 sm:p-6 space-y-5"
                style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}
              >
                <div className="text-center mb-2">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: 'var(--gradient-brand)', boxShadow: '0 6px 20px rgba(28,189,255,0.30)' }}>
                    <Rocket className="w-6 h-6" style={{ color: 'var(--primary-foreground)' }} />
                  </div>
                  <h2 style={{ fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--text-primary)' }}>Ready to Launch</h2>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginTop: 6 }}>
                    Review the details below and start the pipeline.
                  </p>
                  {isClientSelfServe && (
                    <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-quaternary)', marginTop: 10, lineHeight: 1.5 }}>
                      After recon completes, the run may pause at review gates before the next phases continue. You can track progress on the pipeline screen.
                    </p>
                  )}
                </div>

                {/* Summary */}
                <div className="space-y-2 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                  {[
                    ['Website', url],
                    name ? ['Company', name] : null,
                    industry ? ['Industry', industry] : null,
                    [
                      'Coverage',
                      `${coveragePackage === 'starter' ? 'Starter' : coveragePackage === 'pro' ? 'Pro' : 'Complete'} · ${selectedDomains.length} domain(s)`,
                    ],
                    ['Brief', `${answeredRequired}/${pipelineRequiredTotal} required answered`],
                  ].filter(Boolean).map(([label, value]) => (
                    <div key={label} className="flex items-start gap-3">
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: 90, paddingTop: 1 }}>{label}</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: 'var(--callout-error-bg)', border: '1px solid var(--callout-error-border)', color: 'var(--score-1)' }}>
                    <Warning className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg text-sm glc-touch-target sm:min-h-0 sm:min-w-0"
                    style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', backgroundColor: 'transparent' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading ? { scale: 1.015 } : {}} whileTap={!loading ? { scale: 0.985 } : {}}
                    className="flex-1 flex items-center justify-center gap-2 py-3 sm:py-2.5 rounded-lg text-sm font-semibold glc-touch-target sm:min-h-0"
                    style={{ background: 'var(--gradient-accent)', color: 'var(--primary-foreground)', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', boxShadow: '0 4px 14px rgba(242,79,29,0.30)' }}
                  >
                    {loading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        Starting...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Lightning className="w-4 h-4" /> Launch Audit
                      </span>
                    )}
                  </motion.button>
                </div>

                {clientDraftSaveSection}
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppShell>
  );
}
