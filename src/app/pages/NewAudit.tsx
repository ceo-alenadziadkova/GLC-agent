import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import {
  Globe, ArrowRight, ArrowLeft, MagnifyingGlass, HardDrives, Shield,
  Cursor, Target, Lightning, MapTrifold, CheckCircle, Warning,
  ClipboardText, Rocket, Circle, Copy, X,
} from '@phosphor-icons/react';
import { AppShell } from '../components/AppShell';
import { BriefField } from '../components/BriefField';
import { SectionLabel } from '../components/glc/SectionLabel';
import { useAuth } from '../hooks/useAuth';
import { briefResponsesToIntakeMap, useIntakeBankMetrics } from '../hooks/useIntakeWizard';
import { IntakeBankCoverageHint } from '../components/IntakeBankCoverageHint';
import { IntakeBankWizard } from '../components/IntakeBankWizard';
import { prepareBriefForValidation } from '../../../server/src/intake/hydrate-legacy-from-bank';
import { api, ApiError } from '../data/apiService';
import { INDUSTRY_OPTIONS, isIndustryOption } from '../data/industry-options';
import { applyIntakeMetadataPrefill } from '../lib/intake-client-copy';
import {
  BRIEF_QUESTIONS,
  BRIEF_SECTIONS,
  REQUIRED_IDS,
  countAnswered,
  mergeBriefResponsesPreferFilled,
  type BriefResponseEntry,
  type BriefResponses,
  type BriefQuestion,
} from '../data/briefQuestions';

// ── Step indicator ────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Basics',  icon: Globe },
  { label: 'Brief',   icon: ClipboardText },
  { label: 'Launch',  icon: Rocket },
];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-1 mb-8 justify-center">
      {STEPS.map((s, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={s.label} className="flex items-center gap-1">
            <div className="flex flex-col items-center gap-1">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center"
                style={{
                  background: done
                    ? 'var(--score-5-bg)'
                    : active
                      ? 'var(--gradient-brand)'
                      : 'var(--bg-muted)',
                  border: done
                    ? '1px solid var(--score-5-border)'
                    : active
                      ? 'none'
                      : '1px solid var(--border-subtle)',
                  boxShadow: active ? '0 0 12px rgba(28,189,255,0.30)' : 'none',
                }}
              >
                {done
                  ? <CheckCircle weight="fill" className="w-4 h-4" style={{ color: 'var(--score-5)' }} />
                  : <s.icon className="w-4 h-4" style={{ color: active ? 'var(--primary-foreground)' : 'var(--text-tertiary)' }} />}
              </div>
              <span
                style={{
                  fontSize: '10px',
                  color: active ? 'var(--text-blue)' : 'var(--text-tertiary)',
                  letterSpacing: '0.04em',
                  fontWeight: active ? 600 : 400,
                }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="w-10 h-px mb-4"
                style={{ background: i < current ? 'var(--score-5)' : 'var(--border-default)' }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Domain pills (Step 1) ─────────────────────────────────────────────────────

const DOMAIN_PILLS = [
  { icon: MagnifyingGlass, label: 'Recon',      color: 'var(--glc-blue)'      },
  { icon: HardDrives,      label: 'Tech',        color: '#8B5CF6'              },
  { icon: Shield,          label: 'Security',    color: 'var(--score-1)'       },
  { icon: Globe,           label: 'SEO',         color: 'var(--glc-green)'     },
  { icon: Cursor,          label: 'UX',          color: 'var(--score-3)'       },
  { icon: Target,          label: 'Marketing',   color: 'var(--glc-orange)'    },
  { icon: Lightning,       label: 'Automation',  color: 'var(--glc-blue-dark)' },
  { icon: MapTrifold,      label: 'Strategy',    color: 'var(--glc-green-dark)'},
];

const NEXT_ACTION_TEXT: Record<string, string> = {
  complete_required: 'Complete required fields to start the audit.',
  add_recommended: 'Add a few recommended details to improve audit quality.',
  confirm_prefill: 'Confirm auto-detected prefill data before launch.',
  none: 'Your intake is ready.',
};

// ── Main component ────────────────────────────────────────────────────────────

function normalizeIntakeToResponses(raw: Record<string, unknown>): BriefResponses {
  const out: BriefResponses = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v != null && typeof v === 'object' && !Array.isArray(v) && 'value' in (v as Record<string, unknown>)) {
      out[k] = { value: (v as BriefResponseEntry).value, source: 'client' };
    } else {
      out[k] = { value: v as BriefResponseEntry['value'], source: 'client' };
    }
  }
  return out;
}

function unwrapBriefString(responses: BriefResponses, id: string): string | undefined {
  const raw = responses[id];
  if (raw == null) return undefined;
  const v =
    typeof raw === 'object' && !Array.isArray(raw) && 'value' in raw
      ? (raw as BriefResponseEntry).value
      : raw;
  if (typeof v !== 'string') return undefined;
  const t = v.trim();
  return t.length ? t : undefined;
}

/** Map pre-brief website answer to audit URL; skip placeholders with no real site. */
function websiteAnswerToAuditUrl(raw: string): string | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const lower = t.toLowerCase();
  if (lower === 'none' || lower === 'no website' || lower === 'n/a' || lower === 'na') return undefined;
  return t.startsWith('http') ? t : `https://${t}`;
}

/** Aligns step-0 Basics fields with intake brief question ids before save. */
function buildStep0IntakePatch(
  name: string,
  industry: string,
  industrySpecify: string,
  url: string,
  noPublicWebsite: boolean
): Partial<BriefResponses> {
  const patch: Partial<BriefResponses> = {};
  const nt = name.trim();
  if (nt) {
    patch.intake_company_name = { value: nt, source: 'consultant' };
  }
  if (industry.trim() && isIndustryOption(industry)) {
    patch.intake_industry = { value: industry, source: 'consultant' };
  }
  const spec = industrySpecify.trim();
  if (industry.trim() === 'Other' && spec) {
    patch.intake_industry_specify = { value: spec, source: 'consultant' };
  }
  if (noPublicWebsite) {
    patch.intake_company_website = { value: 'none', source: 'consultant' };
  } else {
    const ut = url.trim();
    if (ut) {
      patch.intake_company_website = {
        value: ut.startsWith('http') ? ut : `https://${ut}`,
        source: 'consultant',
      };
    }
  }
  return patch;
}

function defaultConsultantDisplayName(user: ReturnType<typeof useAuth>['user']): string {
  if (!user) return '';
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const full = typeof meta?.full_name === 'string' ? meta.full_name.trim() : '';
  if (full) return full;
  return user.email?.split('@')[0]?.trim() ?? '';
}

export function NewAudit() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const intakeTokenFromUrl = searchParams.get('intake')?.trim() ?? '';

  // Step 1 fields
  const [url,         setUrl]         = useState('');
  const [noPublicWebsite, setNoPublicWebsite] = useState(false);
  const [name,        setName]        = useState('');
  const [industry,    setIndustry]    = useState('');
  /** Free-text sector when industry is Other (synced from client pre-brief when linking ?intake=). */
  const [industrySpecify, setIndustrySpecify] = useState('');
  const [productMode, setProductMode] = useState<'full' | 'express'>('full');

  // Step 2 fields
  const [responses, setResponses] = useState<BriefResponses>({});
  const [intakePrefillActive, setIntakePrefillActive] = useState(false);

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

  /** Classic = all legacy sections; wizard = full question-bank v1 step-by-step. */
  const [briefUiMode, setBriefUiMode] = useState<'classic' | 'wizard'>('classic');

  // UI state
  const [step,    setStep]    = useState(0);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!intakeTokenFromUrl) return;
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

        const web = unwrapBriefString(merged, 'intake_company_website');
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
          unwrapBriefString(merged, 'intake_company_name')
          ?? (typeof data.metadata?.company_name === 'string' ? data.metadata.company_name.trim() : undefined);
        if (cname) {
          setName(n => (n.trim() ? n : cname));
        }

        const ind = unwrapBriefString(merged, 'intake_industry');
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
  }, [intakeTokenFromUrl]);

  // ── Validation ──────────────────────────────────────────
  function isValidUrl(raw: string): boolean {
    const trimmed = raw.trim();
    if (!trimmed) return false;
    try {
      const prefixed = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
      return new URL(prefixed).hostname.includes('.');
    } catch { return false; }
  }

  const step1Valid =
    (noPublicWebsite || isValidUrl(url))
    && (industry !== 'Other' || industrySpecify.trim().length > 0);

  const effectiveBriefForGates = useMemo(() => {
    const prepared = prepareBriefForValidation(briefResponsesToIntakeMap(responses)) as Record<string, unknown>;
    return normalizeIntakeToResponses(prepared);
  }, [responses]);

  const answeredRequired = countAnswered(effectiveBriefForGates, REQUIRED_IDS);
  const step2Complete    = answeredRequired === REQUIRED_IDS.length;
  const progressPct = Math.min(100, Math.round((answeredRequired / REQUIRED_IDS.length) * 100));
  const readinessBadge: 'low' | 'medium' | 'high' = progressPct >= 80 ? 'high' : progressPct >= 45 ? 'medium' : 'low';
  const nextBestAction = step2Complete ? 'add_recommended' : 'complete_required';
  const bankMetrics = useIntakeBankMetrics(
    responses,
    noPublicWebsite && briefUiMode === 'wizard' ? 'discovery' : undefined,
  );

  // ── Handlers ───────────────────────────────────────────
  function handleResponseChange(id: string, value: string | string[] | number | null) {
    setResponses(prev => ({ ...prev, [id]: { value, source: interviewMode ? 'consultant' : 'client' } }));
  }

  function handleSetUnknown(id: string) {
    setResponses(prev => ({ ...prev, [id]: { value: null, source: 'unknown' } }));
  }

  async function handleLaunch(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // 1. Create audit
      const audit = await api.createAudit(url, name || undefined, industry || undefined, productMode, {
        noPublicWebsite,
      });

      const localWithBasics: BriefResponses = {
        ...responses,
        ...buildStep0IntakePatch(name, industry, industrySpecify, url, noPublicWebsite),
      };
      if (industry !== 'Other') {
        delete localWithBasics.intake_industry_specify;
      }

      // 2. Link any pre-brief tokens (modal link or ?intake= URL) so client answers merge into intake_brief
      const tokenCandidates = [...new Set([preBriefToken, intakeTokenFromUrl].filter(Boolean))] as string[];
      for (const t of tokenCandidates) {
        try {
          await api.linkIntakeTokenToAudit(t, audit.id);
        } catch (linkErr) {
          console.warn('[NewAudit] linkIntakeTokenToAudit failed (non-fatal):', linkErr);
        }
      }

      let mergedForSave = localWithBasics;
      if (tokenCandidates.length > 0) {
        try {
          const { brief } = await api.getBrief(audit.id);
          const fromServer = normalizeIntakeToResponses((brief?.responses as Record<string, unknown>) ?? {});
          mergedForSave = mergeBriefResponsesPreferFilled(fromServer, localWithBasics);
        } catch (mergeErr) {
          console.warn('[NewAudit] getBrief merge failed (non-fatal):', mergeErr);
        }
      }

      try {
        await api.saveBrief(audit.id, mergedForSave, {
          collection_mode:
            noPublicWebsite && briefUiMode === 'wizard' ? 'discovery' : undefined,
        });
      } catch (briefErr) {
        console.warn('[NewAudit] Brief save failed (non-fatal):', briefErr);
      }

      await api.startPipeline(audit.id);
      setPreBriefToken(null);

      navigate(`/pipeline/${audit.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : (err as Error).message);
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
        setPreBriefErr('Describe the sector when Industry is Other.');
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

  // ── Render ─────────────────────────────────────────────
  return (
    <AppShell title="New Audit" subtitle="Start a comprehensive 8-domain business analysis">
      <div
        className="min-h-full flex flex-col items-center justify-center py-12 px-6 relative"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="absolute inset-0 pointer-events-none" style={{ background: 'var(--mesh-brand)', opacity: 0.55 }} />

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.38, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full"
          style={{ maxWidth: step === 1 ? 640 : 460 }}
        >
          <StepIndicator current={step} />

          <AnimatePresence mode="wait">

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
                <div className="text-center mb-8">
                  <SectionLabel accent>GLC Audit Platform</SectionLabel>
                  <h1 className="mt-2" style={{ fontSize: 'var(--text-3xl)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, letterSpacing: 'var(--tracking-tight)' }}>
                    Start a New Audit
                  </h1>
                  <p className="mt-2.5" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
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
                <form onSubmit={e => { e.preventDefault(); if (step1Valid) setStep(1); }} className="glc-card p-6 space-y-5" style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}>
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
                        type="url"
                        value={url}
                        onChange={e => {
                          setNoPublicWebsite(false);
                          setUrl(e.target.value);
                        }}
                        placeholder="https://company.com"
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

                  {/* Product mode */}
                  <div className="space-y-2">
                    <label className="block font-medium" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>Audit Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['full', 'express'] as const).map(mode => {
                        const sel = productMode === mode;
                        return (
                          <button key={mode} type="button" onClick={() => setProductMode(mode)}
                            className="rounded-lg px-3 py-2.5 text-left text-xs transition-all"
                            style={{ backgroundColor: sel ? 'rgba(28,189,255,0.08)' : 'var(--bg-inset)', border: sel ? '1px solid rgba(28,189,255,0.30)' : '1px solid var(--border-subtle)' }}
                          >
                            <div className="font-semibold" style={{ color: sel ? 'var(--glc-blue-deeper)' : 'var(--text-primary)' }}>{mode === 'full' ? 'Full Audit' : 'Express'}</div>
                            <div style={{ color: 'var(--text-tertiary)', marginTop: 2 }}>{mode === 'full' ? 'All 6 domains + strategy' : '4 key domains, faster'}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="glc-divider" />

                  <motion.button type="submit" disabled={!step1Valid}
                    whileHover={step1Valid ? { scale: 1.015 } : {}} whileTap={step1Valid ? { scale: 0.985 } : {}}
                    className="w-full flex items-center justify-center gap-2 py-3 font-semibold"
                    style={{
                      borderRadius: 'var(--radius-lg)',
                      background: step1Valid ? 'var(--gradient-brand)' : 'var(--bg-muted)',
                      color: step1Valid ? 'var(--primary-foreground)' : 'var(--text-secondary)',
                      cursor: step1Valid ? 'pointer' : 'not-allowed',
                      fontSize: 'var(--text-sm)',
                      border: step1Valid ? 'none' : '1px solid var(--border-subtle)',
                      boxShadow: step1Valid ? '0 4px 14px rgba(28,189,255,0.28)' : 'none',
                    }}
                  >
                    Continue to Brief <ArrowRight className="w-4 h-4" />
                  </motion.button>

                  {/* Interview mode toggle */}
                  <label
                    className="flex items-center gap-2.5 cursor-pointer select-none rounded-lg px-3 py-2.5 transition-all"
                    style={{
                      border: interviewMode ? '1px solid rgba(245,158,11,0.35)' : '1px solid var(--border-subtle)',
                      background: interviewMode ? 'rgba(245,158,11,0.06)' : 'var(--bg-inset)',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={interviewMode}
                      onChange={e => setInterviewMode(e.target.checked)}
                      className="rounded"
                      style={{ accentColor: '#F59E0B', width: 15, height: 15, flexShrink: 0 }}
                    />
                    <div>
                      <span className="text-sm font-medium" style={{ color: interviewMode ? '#D97706' : 'var(--text-primary)' }}>
                        Interview mode
                      </span>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                        {interviewMode
                          ? 'Coaching prompts visible. Answers tagged as consultant-sourced.'
                          : "I'm filling this during a live call — show coaching hints"}
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
                </form>

                {preBriefOpen && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    style={{ background: 'rgba(0,0,0,0.55)' }}
                    onClick={closePreBriefModal}
                    onKeyDown={(e) => { if (e.key === 'Escape') closePreBriefModal(); }}
                    role="presentation"
                  >
                    <div
                      className="glc-card p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto"
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
                          <input value={preBriefWebsite} onChange={e => setPreBriefWebsite(e.target.value)} placeholder="https://… or leave empty for client to fill" className="w-full px-3 py-2 rounded-lg text-sm" style={{ border: '1px solid var(--border-default)', background: 'var(--bg-surface)', color: 'var(--text-primary)' }} />
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
                className="glc-card p-6"
                style={{ borderRadius: 'var(--radius-2xl)', boxShadow: 'var(--shadow-lg)' }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)' }}>Intake Brief</h2>
                    {interviewMode && (
                      <span
                        className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
                        style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.30)', color: '#D97706' }}
                      >
                        Interview
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <div
                      className="flex rounded-lg p-0.5"
                      style={{ background: 'var(--bg-muted)', border: '1px solid var(--border-subtle)' }}
                      role="group"
                      aria-label="Brief layout"
                    >
                      <button
                        type="button"
                        onClick={() => setBriefUiMode('classic')}
                        className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                        style={{
                          background: briefUiMode === 'classic' ? 'var(--bg-surface)' : 'transparent',
                          color: briefUiMode === 'classic' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          boxShadow: briefUiMode === 'classic' ? 'var(--shadow-xs)' : 'none',
                        }}
                      >
                        All sections
                      </button>
                      <button
                        type="button"
                        onClick={() => setBriefUiMode('wizard')}
                        className="px-2.5 py-1 rounded-md text-xs font-medium transition-colors"
                        style={{
                          background: briefUiMode === 'wizard' ? 'var(--bg-surface)' : 'transparent',
                          color: briefUiMode === 'wizard' ? 'var(--text-primary)' : 'var(--text-tertiary)',
                          boxShadow: briefUiMode === 'wizard' ? 'var(--shadow-xs)' : 'none',
                        }}
                      >
                        Step-by-step (bank)
                      </button>
                    </div>
                    <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
                      {answeredRequired} / {REQUIRED_IDS.length} required
                    </span>
                  </div>
                </div>
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
                  />
                </div>
                {interviewMode && (
                  <div className="mb-3 flex items-start gap-2 px-3 py-2 rounded-lg text-xs" style={{ background: 'rgba(245,158,11,0.07)', border: '1px solid rgba(245,158,11,0.22)', color: '#92400E' }}>
                    <span style={{ flexShrink: 0, marginTop: 1 }}>&#9679;</span>
                    <span>
                      Coaching hints visible. Answers are tagged <strong>consultant</strong> — agents weight them as high-confidence.
                      Client answers from pre-brief are tagged <strong>client</strong> and shown in blue.
                    </span>
                  </div>
                )}
                {intakePrefillActive && (
                  <div className="mb-4 px-3 py-2 rounded-lg text-sm" style={{ background: 'rgba(28,189,255,0.08)', border: '1px solid rgba(28,189,255,0.22)', color: 'var(--text-secondary)' }}>
                    Pre-filled from client&apos;s pre-brief answers. Review before launch.
                  </div>
                )}
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-tertiary)', marginBottom: 20 }}>
                  These questions feed directly into the AI agents.{' '}
                  <strong className="inline-flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                    <Circle size={7} weight="fill" style={{ color: '#EF4444' }} />
                    Required
                  </strong>{' '}
                  questions must be answered to start the pipeline.
                </p>

                {/* Progress bar */}
                <div className="rounded-full overflow-hidden mb-6" style={{ height: 3, backgroundColor: 'var(--bg-muted)' }}>
                  <div className="h-full rounded-full transition-all" style={{ width: `${(answeredRequired / REQUIRED_IDS.length) * 100}%`, background: 'var(--gradient-brand)' }} />
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', marginBottom: 14 }}>
                  {NEXT_ACTION_TEXT[nextBestAction]}
                </p>

                {briefUiMode === 'wizard' ? (
                  <div className="max-h-[55vh] overflow-y-auto pr-1">
                    <IntakeBankWizard
                      responses={responses}
                      onResponsesChange={patch =>
                        setResponses(prev => mergeBriefResponsesPreferFilled(prev, patch))
                      }
                      interviewMode={interviewMode}
                      emphasizeClientSource={intakePrefillActive}
                      answerSource={interviewMode ? 'consultant' : 'client'}
                      collectionMode={noPublicWebsite ? 'discovery' : undefined}
                    />
                  </div>
                ) : (
                  <div className="space-y-8 max-h-[55vh] overflow-y-auto pr-1">
                    {BRIEF_SECTIONS.map(section => {
                      const sectionQs = BRIEF_QUESTIONS.filter(q => q.section === section);
                      return (
                        <div key={section}>
                          <div className="px-2 py-1 mb-3 rounded" style={{ backgroundColor: 'rgba(28,189,255,0.05)', borderLeft: '2px solid rgba(28,189,255,0.25)' }}>
                            <span style={{ fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', color: 'rgba(28,189,255,0.7)', textTransform: 'uppercase' }}>
                              {section}
                            </span>
                          </div>
                          <div className="space-y-5">
                            {sectionQs.map(q => (
                              <BriefField
                                key={q.id}
                                q={q}
                                value={responses[q.id]}
                                onChange={v => handleResponseChange(q.id, v)}
                                onSetUnknown={() => handleSetUnknown(q.id)}
                                emphasizeClientSource={intakePrefillActive}
                                interviewMode={interviewMode}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="glc-divider mt-5" />

                {/* Navigation */}
                <div className="flex items-center gap-3 mt-4">
                  <button type="button" onClick={() => setStep(0)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm"
                    style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', backgroundColor: 'transparent' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <button type="button" onClick={() => setStep(2)} disabled={!step2Complete}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all"
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
                      : <><Warning className="w-4 h-4" /> Fill {REQUIRED_IDS.length - answeredRequired} more required</>}
                  </button>
                </div>
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
                className="glc-card p-6 space-y-5"
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
                </div>

                {/* Summary */}
                <div className="space-y-2 rounded-xl p-4" style={{ backgroundColor: 'var(--bg-inset)', border: '1px solid var(--border-subtle)' }}>
                  {[
                    ['Website', url],
                    name ? ['Company', name] : null,
                    industry ? ['Industry', industry] : null,
                    ['Audit type', productMode === 'full' ? 'Full Audit (6 domains + strategy)' : 'Express (4 domains)'],
                    ['Brief', `${answeredRequired}/${REQUIRED_IDS.length} required answered`],
                  ].filter(Boolean).map(([label, value]) => (
                    <div key={label} className="flex items-start gap-3">
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)', minWidth: 90, paddingTop: 1 }}>{label}</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{value}</span>
                    </div>
                  ))}
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-4 py-3 rounded-lg text-sm"
                    style={{ backgroundColor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.20)', color: '#EF4444' }}>
                    <Warning className="w-4 h-4 flex-shrink-0" />{error}
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setStep(1)}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm"
                    style={{ color: 'var(--text-tertiary)', border: '1px solid var(--border-subtle)', backgroundColor: 'transparent' }}
                  >
                    <ArrowLeft className="w-3.5 h-3.5" /> Back
                  </button>
                  <motion.button type="submit" disabled={loading}
                    whileHover={!loading ? { scale: 1.015 } : {}} whileTap={!loading ? { scale: 0.985 } : {}}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold"
                    style={{ background: 'var(--gradient-accent)', color: 'var(--primary-foreground)', cursor: loading ? 'not-allowed' : 'pointer', border: 'none', boxShadow: '0 4px 14px rgba(242,79,29,0.30)' }}
                  >
                    <AnimatePresence mode="wait">
                      {loading
                        ? <motion.span key="l" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />Starting...
                          </motion.span>
                        : <motion.span key="i" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                            <Lightning className="w-4 h-4" /> Launch Audit
                          </motion.span>}
                    </AnimatePresence>
                  </motion.button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AppShell>
  );
}
