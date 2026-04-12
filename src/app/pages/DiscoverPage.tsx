/**
 * Mode C — Discovery flow (public, no auth required).
 *
 * Sequential branching questionnaire for businesses without a public website.
 * After answering, shows personalised business findings (wow effect) and a
 * teaser of what the full audit would reveal.
 *
 * Answers use bank IDs (a2, a4, d1, c_nosite_1, etc.) so they carry directly
 * into IntakeBankWizard when the client registers — no mapping needed.
 */
import { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import type { Icon } from '@phosphor-icons/react';
import {
  ArrowRight, CheckCircle, Check, Warning,
  ChartBar, ArrowLeft, PaperPlaneRight,
  Spinner, CurrencyCircleDollar, Clock, Eye, TrendUp,
  Gear, ChartLine, MagnifyingGlass, Buildings,
  Users, Robot,
} from '@phosphor-icons/react';
import {
  buildQuestionSequence,
  computeFindings,
  computeScore,
  getQuestion,
  setDiscoveryUiFragmentQuestions,
  type DiscoveryAnswers,
  type DiscoveryFinding,
  type DiscoveryQuestion,
} from '../lib/discovery-flow';
import type { IntakeVersionTuple } from '../data/auditTypes';
import { discoverApi } from '../data/api/discover';
import { api } from '../data/apiService';
import { choiceValueNeedsSpecify, DISCOVERY_RESULTS_TEASER } from '@glc/intake-core';
import { DISCOVERY_INDUSTRY_TEASER_ICONS } from '../lib/discovery-industry-teaser-icons';
import { GLC_BRAND_HEX } from '@glc/brand-tokens';
import {
  createDiscoveryAnalyticsSink,
  discoveryTrackQuestionAnswered,
  discoveryTrackQuestionShown,
  discoveryTrackQuestionSkipped,
  discoveryTrackResultsViewed,
  discoveryTrackWizardCompleted,
} from '../lib/discovery-analytics';
import {
  DISCOVER_QUESTION_SCROLL_DELAY_MS,
  DISCOVER_WIZARD_SAVE_TIMEOUT_MS,
} from '../config/discover-page-defaults';
import { UI_SEMANTIC_COLORS } from '../config/ui-semantic-colors';
import discoveryUiCopy from '../data/discovery-ui-copy.en.json';
import discoverResultsUi from '../data/discover-page-results-ui.en.json';

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAnswered(val: DiscoveryAnswers[string]): boolean {
  if (val == null) return false;
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0;
  return false;
}

function summarise(val: DiscoveryAnswers[string], qId: string, all: DiscoveryAnswers): string {
  if (!isAnswered(val)) return '—';
  let base = Array.isArray(val) ? val.join(', ') : String(val).trim();
  if (choiceValueNeedsSpecify(val)) {
    const k = `${qId}__other`;
    const s = typeof all[k] === 'string' ? all[k].trim() : '';
    if (s) base = `${base} (${s})`;
  }
  return base;
}

// ── Answer input ──────────────────────────────────────────────────────────────

function QuestionInput({
  qId,
  value,
  onChange,
  specifyValue,
  onSpecifyChange,
}: {
  qId: string;
  value: DiscoveryAnswers[string];
  onChange: (v: DiscoveryAnswers[string]) => void;
  specifyValue: string;
  onSpecifyChange: (text: string) => void;
}) {
  const q = getQuestion(qId);
  if (!q) return null;

  const freeTextPlaceholderById = discoveryUiCopy.freeTextPlaceholders as Record<string, string>;

  const strVal = typeof value === 'string' ? value : '';
  const arrVal = Array.isArray(value) ? value : [];

  if (q.type === 'free_text') {
    return (
      <div className="space-y-1.5">
        <textarea
          autoFocus
          rows={3}
          value={strVal}
          onChange={e => onChange(e.target.value || null)}
          placeholder={
            freeTextPlaceholderById[qId] ?? discoveryUiCopy.freeTextDefaultPlaceholder
          }
          className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
          style={{
            background: 'var(--input-background)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)',
            lineHeight: 1.6,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--glc-blue)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
        />
        <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
          {discoverResultsUi.copy.questionInputHelp}
        </p>
      </div>
    );
  }

  if (q.type === 'single_choice' && q.options) {
    const needsSpec = choiceValueNeedsSpecify(strVal);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {q.options.map(opt => {
            const sel = strVal === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange(sel ? null : opt)}
                className="px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: sel ? 'var(--callout-info-bg)' : 'var(--bg-muted)',
                  border: sel ? '1px solid var(--callout-info-border-strong)' : '1px solid var(--border-default)',
                  color: sel ? 'var(--glc-blue)' : 'var(--text-secondary)',
                  fontWeight: sel ? 500 : 400,
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
        {needsSpec && (
          <input
            type="text"
            value={specifyValue}
            onChange={e => onSpecifyChange(e.target.value)}
            placeholder={discoverResultsUi.copy.specifyPlaceholder}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--input-background)',
              border: '1px solid var(--glc-blue)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--glc-blue)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          />
        )}
      </div>
    );
  }

  if (q.type === 'multi_choice' && q.options) {
    const needsSpec = choiceValueNeedsSpecify(arrVal);
    return (
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          {q.options.map(opt => {
            const sel = arrVal.includes(opt);
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const next = sel ? arrVal.filter(v => v !== opt) : [...arrVal, opt];
                  onChange(next.length ? next : null);
                }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all"
                style={{
                  background: sel ? 'var(--callout-info-bg)' : 'var(--bg-muted)',
                  border: sel ? '1px solid var(--callout-info-border-strong)' : '1px solid var(--border-default)',
                  color: sel ? 'var(--glc-blue)' : 'var(--text-secondary)',
                  fontWeight: sel ? 500 : 400,
                }}
              >
                {sel && <Check size={12} weight="bold" />}
                {opt}
              </button>
            );
          })}
        </div>
        {needsSpec && (
          <input
            type="text"
            value={specifyValue}
            onChange={e => onSpecifyChange(e.target.value)}
            placeholder={discoverResultsUi.copy.specifyPlaceholder}
            className="w-full px-4 py-3 rounded-xl text-sm outline-none"
            style={{
              background: 'var(--input-background)',
              border: '1px solid var(--glc-blue)',
              color: 'var(--text-primary)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--glc-blue)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
          />
        )}
      </div>
    );
  }

  return null;
}

// ── Finding card ──────────────────────────────────────────────────────────────

/** Break long finding copy into sentences so clients can scan the card. */
function splitFindingDetail(detail: string): string[] {
  const t = detail.trim();
  if (!t) return [];
  const parts = t.split('. ').map((segment, i, arr) => {
    if (i < arr.length - 1 && segment.length > 0) return `${segment}.`;
    return segment;
  }).filter(s => s.trim().length > 0);
  return parts.length > 0 ? parts : [t];
}

const HOOK_ICONS: Record<DiscoveryFinding['hook'], Icon> = {
  revenue: CurrencyCircleDollar,
  time: Clock,
  visibility: Eye,
  risk: Warning,
  scale: TrendUp,
};

const hookMetaJson = discoverResultsUi.hookMeta as Record<
  DiscoveryFinding['hook'],
  { label: string; color: string }
>;

const HOOK_META: Record<DiscoveryFinding['hook'], { Icon: Icon; label: string; color: string }> = {
  revenue: { Icon: HOOK_ICONS.revenue, ...hookMetaJson.revenue },
  time: { Icon: HOOK_ICONS.time, ...hookMetaJson.time },
  visibility: { Icon: HOOK_ICONS.visibility, ...hookMetaJson.visibility },
  risk: { Icon: HOOK_ICONS.risk, ...hookMetaJson.risk },
  scale: { Icon: HOOK_ICONS.scale, ...hookMetaJson.scale },
};

function FindingCard({ finding }: { finding: DiscoveryFinding }) {
  const isHigh = finding.impact === 'high';
  const meta = HOOK_META[finding.hook];
  const fc = discoverResultsUi.findingCard;
  return (
    <div
      className="min-w-0 max-w-full overflow-hidden rounded-2xl p-5 sm:p-6 md:p-7"
      style={{
        background: isHigh ? fc.highBackground : fc.mediumBackground,
        border: isHigh ? `1px solid ${fc.highBorder}` : `1px solid ${fc.mediumBorder}`,
        boxSizing: 'border-box',
      }}
    >
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <span
          className="text-[11px] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-lg"
          style={{
            background: fc.zoneBadgeBackground,
            color: isHigh ? fc.zoneTextHigh : fc.zoneTextMedium,
            border: `1px solid ${fc.zoneBadgeBorder}`,
          }}
        >
          {finding.zone}
        </span>
        {isHigh && (
          <Warning size={16} weight="fill" className="flex-shrink-0" style={{ color: fc.warningIcon }} aria-hidden />
        )}
      </div>
      <h2
        className="mb-3 break-words text-pretty"
        style={{ fontSize: '1.25rem', fontWeight: 600, color: fc.headline, lineHeight: 1.38 }}
      >
        {finding.headline}
      </h2>
      <div className="mx-auto w-full max-w-[65ch] space-y-4">
        {splitFindingDetail(finding.detail).map((chunk, idx) => (
          <p
            key={idx}
            className="break-words text-pretty"
            style={{
              fontSize: '1.125rem',
              color: fc.body,
              lineHeight: 1.8,
              overflowWrap: 'anywhere',
            }}
          >
            {chunk}
          </p>
        ))}
      </div>
      <div
        className="mt-5 flex items-center gap-2.5 rounded-xl px-3 py-2.5 sm:px-3.5 sm:py-3"
        style={{
          background: fc.hookRowBackground,
          border: `1px solid ${fc.hookRowBorder}`,
        }}
      >
        <meta.Icon size={20} weight="fill" style={{ color: meta.color, opacity: 1 }} aria-hidden />
        <span style={{ fontSize: '0.875rem', color: meta.color, fontWeight: 700, letterSpacing: '0.02em' }}>
          {meta.label}
        </span>
      </div>
    </div>
  );
}

// ── Full-audit teaser ─────────────────────────────────────────────────────────

function AuditTeaser({ industry }: { industry: string | null }) {
  const industryCopy = DISCOVERY_RESULTS_TEASER.industryTeaser;
  const specific =
    industry && industryCopy[industry]
      ? {
          Icon: DISCOVERY_INDUSTRY_TEASER_ICONS[industry] ?? Robot,
          text: industryCopy[industry] as string,
        }
      : null;

  const teaserIcons = [Gear, ChartLine, MagnifyingGlass] as const;
  const bullets: { Icon: Icon; text: string }[] = discoverResultsUi.teaserBullets.map((text, i) => ({
    Icon: teaserIcons[i] ?? Robot,
    text,
  }));
  bullets.push(specific ?? { Icon: Robot, text: DISCOVERY_RESULTS_TEASER.defaultFourthBullet });

  const tz = discoverResultsUi.teaser;

  return (
    <div
      className="min-w-0 max-w-full overflow-hidden rounded-2xl p-5 sm:p-6"
      style={{ background: tz.panelBackground, border: `1px solid ${tz.panelBorder}`, boxSizing: 'border-box' }}
    >
      <p className="text-[0.6875rem] font-semibold uppercase tracking-widest mb-4 break-words" style={{ color: tz.sectionLabel }}>
        {discoverResultsUi.teaserHeading}
      </p>
      <div className="space-y-4">
        {bullets.map(({ Icon, text }, i) => (
          <div key={i} className="flex min-w-0 items-start gap-3">
            <Icon
              size={18}
              weight="fill"
              className="mt-0.5 shrink-0"
              style={{ color: tz.bulletIcon }}
            />
            <p className="min-w-0 break-words text-pretty" style={{ fontSize: '1.0625rem', color: tz.bulletText, lineHeight: 1.72, overflowWrap: 'anywhere' }}>
              {text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export type DiscoverPageProps = {
  layout?: 'page' | 'split';
  /** When embedded in marketing split layout, parent sets true while results are visible so the column can go full width. */
  embedExpanded?: boolean;
  /** Called when the wizard finishes (expand) or user leaves results in split mode (collapse). */
  onEmbedExpandRequest?: (expanded: boolean) => void;
};

// ── Main component ────────────────────────────────────────────────────────────

export function DiscoverPage(props?: DiscoverPageProps) {
  const layout = props?.layout ?? 'page';
  const isSplit = layout === 'split';
  const embedExpanded = props?.embedExpanded ?? false;
  const onEmbedExpandRequest = props?.onEmbedExpandRequest;
  const [answers, setAnswers] = useState<DiscoveryAnswers>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [draft, setDraft] = useState<DiscoveryAnswers[string]>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Session persistence
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [contactEditKey, setContactEditKey] = useState<string | null>(null);

  const intakeVersionsRef = useRef<IntakeVersionTuple | null>(null);
  const sessionTokenRef = useRef<string | null>(null);
  const sinkRef = useRef<ReturnType<typeof createDiscoveryAnalyticsSink> | null>(null);
  if (sinkRef.current == null) {
    sinkRef.current = createDiscoveryAnalyticsSink({
      getIntakeVersions: () => intakeVersionsRef.current,
      getDiscoveryToken: () => sessionTokenRef.current,
    });
  }
  const lastShownKeyRef = useRef<string>('');

  // Contact form
  const [contactName,    setContactName]    = useState('');
  const [contactEmail,   setContactEmail]   = useState('');
  const [contactPhone,   setContactPhone]   = useState('');
  const [contactCompany, setContactCompany] = useState('');
  const [contactSaving,  setContactSaving]  = useState(false);
  const [contactSaved,   setContactSaved]   = useState(false);
  const [contactError,   setContactError]   = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await discoverApi.getUiFragment();
        if (cancelled || !data?.questions?.length) return;
        if (data.intake_versions) {
          intakeVersionsRef.current = data.intake_versions;
        }
        const mapped: DiscoveryQuestion[] = data.questions.map(q => ({
          id: q.id,
          question: q.question,
          hint: q.hint,
          type: q.type,
          options: q.options,
          optional: q.optional,
        }));
        setDiscoveryUiFragmentQuestions(mapped);
      } catch {
        // Bundled fallback in discovery-flow remains active.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    sessionTokenRef.current = sessionToken;
  }, [sessionToken]);

  useEffect(() => {
    const sink = sinkRef.current;
    return () => {
      void sink?.flush();
    };
  }, []);

  const sequence   = buildQuestionSequence(answers);
  const currentId  = sequence[currentIdx] ?? null;
  const currentQ   = currentId ? getQuestion(currentId) : null;
  const answeredIds = sequence.slice(0, currentIdx);

  // Re-compute draft when question changes
  useEffect(() => {
    setDraft(currentId ? (answers[currentId] ?? null) : null);
  }, [currentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll new question into view
  useEffect(() => {
    if (!showResults) {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }, DISCOVER_QUESTION_SCROLL_DELAY_MS);
    }
  }, [currentIdx, showResults]);

  useEffect(() => {
    if (showResults || !currentId) return;
    const sink = sinkRef.current;
    if (!sink) return;
    const key = `${currentIdx}:${currentId}`;
    if (lastShownKeyRef.current === key) return;
    lastShownKeyRef.current = key;
    discoveryTrackQuestionShown(sink, { questionId: currentId, stepIndex: currentIdx });
  }, [currentId, currentIdx, showResults]);

  useEffect(() => {
    if (!showResults) return;
    const sink = sinkRef.current;
    if (sink) discoveryTrackResultsViewed(sink);
  }, [showResults]);

  // Keep marketing split layout full-width while results are visible so the CTA is not stuck below a short scroll pane.
  useEffect(() => {
    if (!showResults || !isSplit) return;
    onEmbedExpandRequest?.(true);
  }, [showResults, isSplit, onEmbedExpandRequest]);

  const specifyKey = currentId ? `${currentId}__other` : '';
  const specifyFilled = !specifyKey || (typeof answers[specifyKey] === 'string' && answers[specifyKey].trim().length > 0);
  const draftNeedsSpec = choiceValueNeedsSpecify(draft);
  // Optional questions allow advancing without an answer
  const canAdvance = Boolean(currentQ?.optional) || (isAnswered(draft) && (!draftNeedsSpec || specifyFilled));
  const allDone    = currentIdx >= sequence.length;

  const findings = computeFindings(answers);
  const industry = answers['a2'] as string | null;
  const teamSize = answers['a4'] as string | null;
  const signalCount = buildQuestionSequence(answers).length;

  function teamOfPhrase(size: string | null): string {
    if (!size) return 'your team';
    if (size === 'Just me') return 'one';
    if (size === '2–10 people') return '2–10';
    if (size === '11–50') return '11–50';
    if (size === '51–200') return '51–200';
    if (size === '200+') return '200+';
    // Legacy bank labels (older sessions)
    if (size === '2–5 people') return '2–5';
    if (size === '6–20 people') return '6–20';
    return 'your team';
  }

  function handleNext() {
    if (!currentId) return;
    const q = getQuestion(currentId);
    const sink = sinkRef.current;
    if (sink) {
      if (q?.optional && !isAnswered(draft)) {
        discoveryTrackQuestionSkipped(sink, { questionId: currentId, stepIndex: currentIdx });
      } else {
        discoveryTrackQuestionAnswered(sink, { questionId: currentId, stepIndex: currentIdx });
      }
    }
    let valueToSave: DiscoveryAnswers[string] = draft;
    if (q?.optional && typeof draft === 'string' && !draft.trim()) {
      valueToSave = null;
    }
    const committed = { ...answers, [currentId]: valueToSave };
    setAnswers(committed);
    const nextSequence = buildQuestionSequence(committed);
    const nextIdx = currentIdx + 1;

    if (nextIdx >= nextSequence.length) {
      if (isSplit) onEmbedExpandRequest?.(true);
      if (sink) discoveryTrackWizardCompleted(sink);
      const finalFindings = computeFindings(committed);
      const saveTimeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), DISCOVER_WIZARD_SAVE_TIMEOUT_MS),
      );
      Promise.race([
        api.saveDiscoverySession({
          answers: committed,
          maturity_level: computeScore(committed),
          findings: finalFindings,
        }),
        saveTimeout,
      ]).then(({ token, contact_edit_key }) => {
        setSessionToken(token);
        setContactEditKey(contact_edit_key);
      }).catch(() => {
        // Timeout or network error — results are still shown, session token not available
      });
      setShowResults(true);
    } else {
      setCurrentIdx(nextIdx);
    }
  }

  async function handleContactSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!contactName.trim() && !contactEmail.trim() && !contactPhone.trim() && !contactCompany.trim()) return;
    setContactSaving(true);
    setContactError(null);
    try {
      if (sessionToken && contactEditKey) {
        await api.saveDiscoveryContact(sessionToken, contactEditKey, {
          contact_name:    contactName.trim()    || undefined,
          contact_email:   contactEmail.trim()   || undefined,
          contact_phone:   contactPhone.trim()   || undefined,
          contact_company: contactCompany.trim() || undefined,
        });
      } else if (sessionToken && !contactEditKey) {
        setContactError(discoverResultsUi.copy.contactMissingEditKey);
        return;
      }
      setContactSaved(true);
    } catch {
      setContactError(discoverResultsUi.copy.contactError);
    } finally {
      setContactSaving(false);
    }
  }

  function handleBack() {
    if (showResults) {
      if (isSplit) onEmbedExpandRequest?.(false);
      setShowResults(false);
      setCurrentIdx(sequence.length - 1);
      setDraft(answers[sequence[sequence.length - 1]] ?? null);
      return;
    }
    if (currentIdx === 0) return;
    const prevIdx = currentIdx - 1;
    const prevId  = sequence[prevIdx];
    setCurrentIdx(prevIdx);
    setDraft(answers[prevId] ?? null);
  }

  // ── Results screen ──────────────────────────────────────────────────────────
  if (showResults) {
    const industryStr = industry ?? discoverResultsUi.copy.signalsIndustryFallback;
    const standaloneResults = !isSplit;
    // Never use the split "compact" scroll pane for results — it hides findings below the fold and hurts readability.
    const compactSplitResults = false;
    const comfortableWidth = 'max-w-3xl sm:max-w-4xl lg:max-w-5xl';

    return (
      <div
        className={
          compactSplitResults
            ? 'relative max-h-[min(78vh,52rem)] w-full min-w-0 max-w-full overflow-x-hidden overflow-y-auto overscroll-contain rounded-2xl'
            : standaloneResults
              ? 'flex min-h-screen w-full min-w-0 flex-col items-stretch px-4 py-10 sm:px-6 sm:py-14'
              : 'relative flex w-full min-w-0 flex-col items-stretch px-4 pb-12 pt-8 sm:px-8 sm:pb-16 sm:pt-10'
        }
        style={{ background: discoverResultsUi.resultsLayout.pageBackground }}
      >
        <div
          className={
            compactSplitResults
              ? 'pointer-events-none absolute inset-0 overflow-hidden rounded-2xl'
              : standaloneResults
                ? 'pointer-events-none fixed inset-0'
                : 'pointer-events-none absolute inset-0'
          }
          style={{ background: discoverResultsUi.resultsLayout.radialGlow, zIndex: 0 }}
          aria-hidden
        />

        <div
          className={`relative z-10 mx-auto w-full min-w-0 ${comfortableWidth} ${compactSplitResults ? 'px-3 py-6 sm:px-4 sm:py-7' : 'px-4 sm:px-6'}`}
        >
          <div className={`flex items-center justify-center gap-2 ${compactSplitResults ? 'mb-6' : 'mb-8 sm:mb-10'}`}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
              <ChartBar size={18} weight="bold" style={{ color: 'var(--primary-foreground)' }} />
            </div>
            <span style={{ fontWeight: 700, fontSize: '1rem', color: discoverResultsUi.header.brandText, letterSpacing: '-0.01em' }}>GLC Audit</span>
          </div>

          <div className={`w-full min-w-0 max-w-full ${compactSplitResults ? 'space-y-5' : 'space-y-6 sm:space-y-7'}`}>
            {/* Plain div: motion/react was leaving an inline width from the narrow split column after expand */}
            <div
              key={embedExpanded ? 'discovery-results-wide' : 'discovery-results-split'}
              className={`w-full min-w-0 max-w-full ${compactSplitResults ? 'space-y-5' : 'space-y-6 sm:space-y-7'}`}
            >
              {/* Header */}
              <header className="text-center mb-1 px-0 min-w-0">
                <div className="inline-flex max-w-full items-center gap-2 px-3 py-1.5 rounded-full mb-3 sm:mb-4" style={{ background: discoverResultsUi.header.analysisBadgeBackground, border: `1px solid ${discoverResultsUi.header.analysisBadgeBorder}` }}>
                  <CheckCircle size={15} weight="fill" className="shrink-0" style={{ color: discoverResultsUi.header.analysisIcon }} />
                  <span className="break-words text-left sm:text-center" style={{ fontSize: '0.75rem', fontWeight: 600, color: discoverResultsUi.header.analysisLabel, letterSpacing: '0.06em' }}>{discoverResultsUi.copy.analysisComplete}</span>
                </div>
                <h1
                  className="break-words text-pretty px-0.5"
                  style={{
                    fontSize: compactSplitResults
                      ? 'clamp(1.125rem, 3.2vw + 0.5rem, 1.5rem)'
                      : 'clamp(1.375rem, 2.5vw, 1.75rem)',
                    fontWeight: 800,
                    color: discoverResultsUi.header.title,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                  }}
                >
                  {discoverResultsUi.copy.resultsTitle}
                </h1>
                <p
                  className="break-words text-pretty mx-auto max-w-full px-0.5"
                  style={{
                    fontSize: compactSplitResults ? '0.875rem' : '1.0625rem',
                    color: discoverResultsUi.header.subtitle,
                    marginTop: 10,
                    lineHeight: 1.6,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {discoverResultsUi.copy.signalsPrefix} {signalCount} signals
                  {industryStr && industryStr !== discoverResultsUi.copy.signalsIndustryFallback ? ` — ${industryStr}` : ''}
                  {teamSize ? `${discoverResultsUi.copy.teamPrefix}${teamOfPhrase(teamSize)}` : ''}
                </p>
              </header>

              {/* Primary CTA — above findings so split / mobile users see it without scrolling past long cards */}
              <div
                className="min-w-0 max-w-full overflow-hidden rounded-2xl p-5 sm:p-6 text-center"
                style={{ background: discoverResultsUi.cta.panelBackground, border: `1px solid ${discoverResultsUi.cta.panelBorder}`, boxSizing: 'border-box' }}
              >
                <Buildings size={26} className="mx-auto mb-3" style={{ color: discoverResultsUi.cta.icon }} />
                <p
                  className="mx-auto mb-[18px] max-w-full break-words text-pretty sm:max-w-md"
                  style={{
                    fontSize: '1.0625rem',
                    fontWeight: 700,
                    color: discoverResultsUi.cta.title,
                    lineHeight: 1.55,
                    overflowWrap: 'anywhere',
                  }}
                >
                  {discoverResultsUi.copy.ctaTitle}
                </p>
                <a
                  href={sessionToken ? `/login?discovery=${sessionToken}` : '/login'}
                  className="inline-flex max-w-full flex-wrap items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold sm:px-6"
                  style={{
                    fontSize: '0.9375rem',
                    background: `linear-gradient(135deg, ${GLC_BRAND_HEX.blue}, ${GLC_BRAND_HEX.blueDeep})`,
                    color: '#fff',
                    textDecoration: 'none',
                    boxSizing: 'border-box',
                  }}
                >
                  <Users size={18} className="shrink-0" />
                  <span className="break-words text-center">{discoverResultsUi.copy.ctaButton}</span>
                  <ArrowRight size={16} className="shrink-0" />
                </a>
                <p style={{ fontSize: '0.8125rem', color: discoverResultsUi.cta.footnote, marginTop: 12 }}>
                  {discoverResultsUi.copy.ctaFootnote}
                </p>
              </div>

              {/* Findings */}
              {findings.length > 0 ? (
                <div className="min-w-0">
                  <div className="min-w-0 space-y-4 sm:space-y-5">
                    {findings.map(f => (
                      <div key={f.id} className="min-w-0 w-full max-w-full">
                        <FindingCard finding={f} />
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="min-w-0 max-w-full overflow-hidden rounded-2xl p-5 sm:p-6 text-center" style={{ background: discoverResultsUi.emptyFindings.panelBackground, border: `1px solid ${discoverResultsUi.emptyFindings.panelBorder}`, boxSizing: 'border-box' }}>
                  <CheckCircle size={26} weight="fill" className="mx-auto mb-3" style={{ color: discoverResultsUi.emptyFindings.icon }} />
                  <p className="font-semibold" style={{ fontSize: '1rem', color: discoverResultsUi.emptyFindings.title }}>{discoverResultsUi.copy.noGapsTitle}</p>
                  <p className="text-pretty max-w-md mx-auto" style={{ fontSize: '0.9375rem', color: discoverResultsUi.emptyFindings.body, marginTop: 8, lineHeight: 1.65 }}>
                    {discoverResultsUi.copy.noGapsBody}
                  </p>
                </div>
              )}

              {/* Full-audit teaser */}
              <AuditTeaser industry={industry} />
            </div>

            {/* Contact form — save results / continue later */}
            {!contactSaved ? (
              <form
                onSubmit={handleContactSubmit}
                className="min-w-0 max-w-full space-y-4 rounded-2xl p-5 sm:p-6"
                style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', boxSizing: 'border-box' }}
              >
                <div>
                  <p className="font-semibold mb-1.5" style={{ fontSize: '1rem', color: 'var(--text-primary)' }}>
                    {discoverResultsUi.copy.contactFormTitle}
                  </p>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {discoverResultsUi.copy.contactFormHint}
                  </p>
                </div>
                <div className="space-y-2.5">
                  {[
                    { placeholder: discoverResultsUi.copy.contactPlaceholders.name, value: contactName, setter: setContactName, type: 'text' },
                    { placeholder: discoverResultsUi.copy.contactPlaceholders.email, value: contactEmail, setter: setContactEmail, type: 'email' },
                    { placeholder: discoverResultsUi.copy.contactPlaceholders.phone, value: contactPhone, setter: setContactPhone, type: 'tel' },
                    { placeholder: discoverResultsUi.copy.contactPlaceholders.company, value: contactCompany, setter: setContactCompany, type: 'text' },
                  ].map(({ placeholder, value, setter, type }) => (
                    <input
                      key={placeholder}
                      type={type}
                      placeholder={placeholder}
                      value={value}
                      onChange={e => setter(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl outline-none"
                      style={{
                        fontSize: '0.9375rem',
                        background: 'var(--input-background)',
                        border: '1px solid var(--border-default)',
                        color: 'var(--text-primary)',
                      }}
                      onFocus={e => { e.currentTarget.style.borderColor = 'var(--glc-blue)'; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                    />
                  ))}
                </div>
                {contactError && (
                  <p style={{ fontSize: '0.875rem', color: 'var(--score-1)' }}>{contactError}</p>
                )}
                <button
                  type="submit"
                  disabled={
                    contactSaving
                    || (!contactName.trim() && !contactEmail.trim() && !contactPhone.trim() && !contactCompany.trim())
                  }
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold"
                  style={{
                    fontSize: '0.9375rem',
                    background: (
                      contactSaving
                      || (!contactName.trim() && !contactEmail.trim() && !contactPhone.trim() && !contactCompany.trim())
                    )
                      ? 'rgba(255,255,255,0.08)'
                      : `linear-gradient(135deg, ${GLC_BRAND_HEX.blue}44, ${GLC_BRAND_HEX.blueDeep}44)`,
                    color: (
                      contactSaving
                      || (!contactName.trim() && !contactEmail.trim() && !contactPhone.trim() && !contactCompany.trim())
                    )
                      ? 'rgba(255,255,255,0.30)'
                      : 'rgba(255,255,255,0.80)',
                    border: '1px solid rgba(28,189,255,0.25)',
                    cursor: (
                      contactSaving
                      || (!contactName.trim() && !contactEmail.trim() && !contactPhone.trim() && !contactCompany.trim())
                    )
                      ? 'not-allowed'
                      : 'pointer',
                  }}
                >
                  <span key={contactSaving ? 'saving' : 'idle'} className="inline-flex items-center justify-center gap-2">
                    {contactSaving ? (
                      <>
                        <Spinner size={14} className="animate-spin" aria-hidden />
                        {discoverResultsUi.copy.contactSaving}
                      </>
                    ) : (
                      <>
                        <PaperPlaneRight size={14} aria-hidden />
                        {discoverResultsUi.copy.contactSave}
                      </>
                    )}
                  </span>
                </button>
              </form>
            ) : (
              <div
                className="flex items-center gap-3 rounded-2xl p-5"
                style={{ background: 'var(--glc-green-muted)', border: '1px solid rgba(14,207,130,0.28)' }}
              >
                <CheckCircle size={22} weight="fill" className="flex-shrink-0" style={{ color: 'var(--glc-green-dark)' }} />
                <div>
                  <p className="font-semibold" style={{ fontSize: '1rem', color: UI_SEMANTIC_COLORS.success }}>{discoverResultsUi.copy.contactSavedTitle}</p>
                  <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)', lineHeight: 1.55 }}>
                    {discoverResultsUi.copy.contactSavedBody}
                  </p>
                </div>
              </div>
            )}

            {/* Back */}
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 mx-auto py-2 rounded-lg"
              style={{ fontSize: '0.9375rem', color: 'rgba(248,250,252,0.55)', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              <ArrowLeft size={16} aria-hidden /> {discoverResultsUi.copy.backReview}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Questionnaire screen ────────────────────────────────────────────────────
  return (
    <div
      className={
        isSplit
          ? 'w-full min-w-0 max-w-full'
          : 'min-h-screen flex flex-col items-center py-10 px-5'
      }
      style={{ background: isSplit ? 'transparent' : 'var(--bg-canvas)' }}
    >
      {!isSplit && (
        <div
          className="fixed inset-0 pointer-events-none"
          style={{ background: 'var(--mesh-brand)', zIndex: 0 }}
          aria-hidden
        />
      )}

      <div className={`relative z-10 w-full min-w-0 ${isSplit ? 'max-w-full' : 'max-w-lg'}`}>
        <div className={`flex items-center justify-between ${isSplit ? 'mb-6' : 'mb-8'}`}>
          {!isSplit && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--gradient-brand)' }}>
                <ChartBar size={16} weight="bold" style={{ color: 'var(--primary-foreground)' }} />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', letterSpacing: '-0.01em' }}>GLC Audit</span>
            </div>
          )}
          {isSplit && <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Your answers</span>}
          <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
            {currentIdx + 1} / {sequence.length}
          </span>
        </div>

        <div className={`rounded-full overflow-hidden ${isSplit ? 'mb-6' : 'mb-8'}`} style={{ height: 2, background: 'var(--bg-muted)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'var(--gradient-brand)' }}
            animate={{ width: `${((currentIdx + (canAdvance ? 1 : 0)) / sequence.length) * 100}%` }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
          />
        </div>

        {/* Intro copy (first question only) — full-page layout only */}
        {!isSplit && currentIdx === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 text-center"
          >
            <h1 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.02em', lineHeight: 1.3 }}>
              Let&apos;s understand your business
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8, lineHeight: 1.6 }}>
              {sequence.length} quick questions — no account needed.
              We&apos;ll show you exactly where the biggest opportunities are.
            </p>
          </motion.div>
        )}

        {/* Answered thread */}
        {answeredIds.length > 0 && (
          <div className="space-y-2 mb-5">
            {answeredIds.map(id => {
              const q = getQuestion(id);
              if (!q) return null;
              return (
                <div
                  key={id}
                  className="flex items-start gap-3 px-3 py-2.5 rounded-xl"
                  style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
                >
                  <CheckCircle size={14} weight="fill" className="mt-0.5 flex-shrink-0" style={{ color: 'var(--glc-green-dark)' }} />
                  <div className="min-w-0 flex-1">
                    <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: 1 }}>{q.question}</p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'var(--text-secondary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      {summarise(answers[id], id, answers)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Current question */}
        {currentQ && (
          <motion.div
            key={currentId}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl p-5 space-y-3"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2">
              <span
                className="inline-flex items-center justify-center rounded-full text-[10px] font-bold"
                style={{
                  width: 20, height: 20,
                  background: 'var(--gradient-brand)',
                  color: 'var(--primary-foreground)',
                }}
              >
                {currentIdx + 1}
              </span>
              {currentQ.type === 'multi_choice' && (
                <span style={{ fontSize: '10px', color: 'var(--text-tertiary)', letterSpacing: '0.04em' }}>
                  SELECT ALL THAT APPLY
                </span>
              )}
            </div>

            <label className="block font-semibold" style={{ fontSize: 15, color: 'var(--text-primary)', lineHeight: 1.4 }}>
              {currentQ.question}
            </label>

            {currentQ.hint && (
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', marginTop: -4 }}>
                {currentQ.hint}
              </p>
            )}

            <QuestionInput
              qId={currentId!}
              value={draft}
              onChange={v => {
                setDraft(v);
                if (!choiceValueNeedsSpecify(v)) {
                  setAnswers(a => {
                    const k = `${currentId}__other`;
                    if (!(k in a)) return a;
                    const next = { ...a };
                    delete next[k];
                    return next;
                  });
                }
              }}
              specifyValue={(() => {
                const v = answers[`${currentId!}__other`];
                return typeof v === 'string' ? v : '';
              })()}
              onSpecifyChange={text => {
                setAnswers(a => ({
                  ...a,
                  [`${currentId!}__other`]: text.trim() || null,
                }));
              }}
            />

            <div className="flex items-center gap-3 pt-1">
              {currentIdx > 0 && (
                <button
                  type="button"
                  onClick={handleBack}
                  className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm"
                  style={{
                    color: 'var(--text-tertiary)',
                    background: 'transparent',
                    border: '1px solid var(--border-default)',
                  }}
                >
                  <ArrowLeft size={14} /> Back
                </button>
              )}
              <button
                type="button"
                onClick={handleNext}
                disabled={!canAdvance}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-transform hover:scale-[1.02] active:scale-[0.97] disabled:hover:scale-100 disabled:active:scale-100"
                style={{
                  background: canAdvance
                    ? 'var(--gradient-brand)'
                    : 'var(--bg-muted)',
                  color: canAdvance ? 'var(--primary-foreground)' : 'var(--text-tertiary)',
                  border: 'none',
                  cursor: canAdvance ? 'pointer' : 'not-allowed',
                  boxShadow: canAdvance ? '0 4px 14px rgba(28,189,255,0.28)' : 'none',
                }}
              >
                {currentIdx < sequence.length - 1 ? (
                  <>Continue <ArrowRight size={15} /></>
                ) : (
                  <>See my findings <ArrowRight size={15} /></>
                )}
              </button>
            </div>
          </motion.div>
        )}

        {/* Edge case: all done but showResults not yet set */}
        {allDone && !showResults && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-4">
            <button
              type="button"
              onClick={() => {
              if (isSplit) onEmbedExpandRequest?.(true);
              setShowResults(true);
            }}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm"
              style={{ background: 'var(--gradient-brand)', color: 'var(--primary-foreground)', border: 'none', cursor: 'pointer' }}
            >
              <CheckCircle size={16} /> View my findings
            </button>
          </motion.div>
        )}

        <div ref={bottomRef} />

        {!isSplit && (
          <p className="text-center mt-8" style={{ fontSize: 11, color: 'var(--text-quaternary)' }}>
            GLC Audit Platform — Discovery
          </p>
        )}
      </div>
    </div>
  );
}
