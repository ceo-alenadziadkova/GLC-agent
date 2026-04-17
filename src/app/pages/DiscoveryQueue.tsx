/**
 * Discovery Queue — consultant-only view of Mode C submissions.
 *
 * Lists discovery_sessions ordered by created_at DESC.
 * Allows "Convert to audit" which creates a full audit from the session.
 */
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import {
  Users, Warning, Lightbulb, ArrowRight,
  CheckCircle, Spinner, ArrowsClockwise, UserCircle,
  EnvelopeSimple, Phone, Calendar, Copy, Buildings,
} from '@phosphor-icons/react';
import { api } from '../data/apiService';
import { AppShell } from '../components/AppShell';
import { glcKeys } from '../lib/glc-keys';
import { UI_FEEDBACK_FLASH_MS } from '../config/ui-feedback-defaults';
import {
  DISCOVERY_QUEUE_COPY,
} from '../config/discovery-queue-copy.en';
import { DISCOVERY_QUEUE_PAGE_CONFIG } from '../config/discovery-queue-page-config';
import { buildAbsoluteUrlFromOrigin } from '../lib/public-app-url';
import { Button } from '../components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiscoverySession {
  session_token:   string;
  maturity_level:  number;
  findings:        Array<{ id: string; zone: string; headline: string; impact: string }>;
  contact_name:    string | null;
  contact_email:   string | null;
  contact_phone:   string | null;
  contact_company: string | null;
  audit_id:        string | null;
  created_at:      string;
  biz_description: string | null;
  industry:        string | null;
}

// ── Maturity helpers ──────────────────────────────────────────────────────────

function maturityLabel(level: number): string {
  const fromCopy = DISCOVERY_QUEUE_COPY.maturity[level as keyof typeof DISCOVERY_QUEUE_COPY.maturity];
  return fromCopy ?? DISCOVERY_QUEUE_COPY.maturityLevelFallback(level);
}

function maturityConfig(level: number): { label: string; toneClass: string } {
  const toneClass = level >= 4 ? 'border-success/50 bg-success/10 text-success' : level >= 3 ? 'border-info/50 bg-info/10 text-info' : 'border-warning/50 bg-warning/10 text-warning';
  return {
    label: maturityLabel(level),
    toneClass,
  };
}

function MaturityPill({ level }: { level: number }) {
  const cfg = maturityConfig(level);
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[length:var(--text-2xs)] font-bold tracking-[0.03em] ${cfg.toneClass}`}
    >
      {level} · {cfg.label}
    </span>
  );
}

// ── Session card ──────────────────────────────────────────────────────────────

function SessionCard({
  session,
  onConvert,
  converting,
}: {
  session: DiscoverySession;
  onConvert: (token: string) => void;
  converting: boolean;
}) {
  const highFindings = session.findings.filter(f => f.impact === 'high');
  const date = new Date(session.created_at).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className={`space-y-4 rounded-2xl border bg-card p-4 mobile:p-5 ${session.audit_id ? 'border-success/40' : 'border-border'}`}>
      {/* Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <MaturityPill level={session.maturity_level} />
            {session.audit_id && (
              <span
                className="text-success inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[length:var(--text-2xs)] font-semibold"
              >
                <CheckCircle size={10} weight="fill" /> {DISCOVERY_QUEUE_COPY.converted}
              </span>
            )}
          </div>
          <div className="text-muted-foreground flex items-center gap-1 text-xs">
            <Calendar size={11} />
            <span>{date}</span>
          </div>
        </div>

        {!session.audit_id && (
          <Button
            type="button"
            disabled={converting}
            onClick={() => onConvert(session.session_token)}
            variant={converting ? 'secondary' : 'default'}
            className={`glc-touch-target flex w-full flex-shrink-0 items-center justify-center gap-1.5 rounded-xl px-3.5 py-3 text-sm font-semibold sm:min-h-0 sm:w-auto sm:py-2 ${
              converting ? 'cursor-not-allowed bg-muted text-muted-foreground' : ''
            }`}
          >
            {converting
              ? <><Spinner size={13} className="animate-spin" /> {DISCOVERY_QUEUE_COPY.creating}</>
              : <>{DISCOVERY_QUEUE_COPY.convertToAudit} <ArrowRight size={13} /></>}
          </Button>
        )}

        {session.audit_id && (
          <a
            href={`/audit/${session.audit_id}`}
            className="text-success glc-touch-target flex w-full items-center justify-center gap-1.5 rounded-xl border border-success/40 bg-success/10 px-3 py-3 text-xs font-semibold no-underline sm:min-h-0 sm:w-auto sm:py-1.5"
          >
            {DISCOVERY_QUEUE_COPY.openAudit} <ArrowRight size={12} />
          </a>
        )}
      </div>

      {/* Business identity — contact details if provided, else biz_description + industry */}
      <div className="space-y-1.5 rounded-xl border bg-muted/30 px-3 py-2">
        {/* Contact info row */}
        {(session.contact_name || session.contact_email || session.contact_phone || session.contact_company) ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {session.contact_name && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <UserCircle size={13} className="text-info" />
                {session.contact_name}
              </span>
            )}
            {session.contact_company && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Buildings size={13} className="text-info" />
                {session.contact_company}
              </span>
            )}
            {session.contact_email && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <EnvelopeSimple size={13} className="text-info" />
                {session.contact_email}
              </span>
            )}
            {session.contact_phone && (
              <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
                <Phone size={13} className="text-info" />
                {session.contact_phone}
              </span>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground text-xs italic">
            {DISCOVERY_QUEUE_COPY.noContactInfo}
          </p>
        )}

        {/* Business description / industry (always show when present — gives context for no-contact sessions) */}
        {(session.biz_description || session.industry) && (
          <div className={`space-y-0.5 ${(session.contact_name || session.contact_email || session.contact_phone || session.contact_company) ? 'border-t pt-1.5' : ''}`}>
            {session.industry && (
              <p className="text-muted-foreground text-xs">
                <span className="text-muted-foreground/80 mr-1">{DISCOVERY_QUEUE_COPY.industryLabel}</span>
                {session.industry}
              </p>
            )}
            {session.biz_description && (
              <p className="text-muted-foreground text-xs leading-relaxed">
                {session.biz_description.length > DISCOVERY_QUEUE_PAGE_CONFIG.bizDescriptionPreviewMaxChars
                  ? `${session.biz_description.slice(0, DISCOVERY_QUEUE_PAGE_CONFIG.bizDescriptionPreviewSliceChars)}…`
                  : session.biz_description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Top findings */}
      {session.findings.length > 0 && (
        <div className="space-y-1.5">
          {session.findings.slice(0, DISCOVERY_QUEUE_PAGE_CONFIG.findingsPreviewCount).map(f => {
            const isHigh = f.impact === 'high';
            return (
              <div key={f.id} className="flex items-start gap-2">
                {isHigh
                  ? <Warning size={12} weight="fill" className="text-destructive mt-0.5 flex-shrink-0" />
                  : <Lightbulb size={12} weight="fill" className="text-warning mt-0.5 flex-shrink-0" />}
                <span className="text-muted-foreground text-xs leading-relaxed">
                  <span
                    className={`mr-1 text-[length:var(--text-2xs)] font-semibold uppercase tracking-[0.04em] ${isHigh ? 'text-destructive' : 'text-warning'}`}
                  >
                    {f.zone}
                  </span>
                  {f.headline}
                </span>
              </div>
            );
          })}
          {session.findings.length > DISCOVERY_QUEUE_PAGE_CONFIG.findingsPreviewCount && (
            <p className="text-muted-foreground pl-4 text-xs">
              {DISCOVERY_QUEUE_COPY.moreFindings(
                session.findings.length - DISCOVERY_QUEUE_PAGE_CONFIG.findingsPreviewCount,
              )}
            </p>
          )}
        </div>
      )}
      {highFindings.length === 0 && session.findings.length === 0 && (
        <p className="text-muted-foreground text-xs">{DISCOVERY_QUEUE_COPY.noFindingsRecorded}</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DiscoveryQueue() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: glcKeys.discoverySessions(),
    queryFn: async () => {
      const { sessions: data } = await api.listDiscoverySessions();
      return data as DiscoverySession[];
    },
    staleTime: DISCOVERY_QUEUE_PAGE_CONFIG.staleTimeMs,
  });

  const sessions = q.data ?? [];
  const loading = q.isPending && !q.data;
  const error = q.error ? DISCOVERY_QUEUE_COPY.loadError : null;

  const [converting, setConverting] = useState<string | null>(null); // token currently converting
  const [convertError, setConvertError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'converted'>('all');
  const [linkCopied, setLinkCopied] = useState(false);

  const refetchSessions = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: glcKeys.discoverySessions() });
  }, [queryClient]);

  async function handleConvert(token: string) {
    setConverting(token);
    setConvertError(null);
    try {
      const { audit_id } = await api.convertDiscoverySession(token);
      queryClient.setQueryData<DiscoverySession[]>(glcKeys.discoverySessions(), (prev) =>
        (prev ?? []).map((s) => (s.session_token === token ? { ...s, audit_id } : s)),
      );
      // New full audit with discovery answers pre-mapped into intake_brief — open workspace + brief, not pipeline.
      navigate(`/audit/${audit_id}?brief=1`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setConvertError(msg.includes('already converted')
        ? DISCOVERY_QUEUE_COPY.convertAlreadyConverted
        : DISCOVERY_QUEUE_COPY.convertGenericFailure);
      setConverting(null);
    }
  }

  const filtered = sessions.filter(s => {
    if (filter === 'new') return !s.audit_id;
    if (filter === 'converted') return !!s.audit_id;
    return true;
  });

  const newCount = sessions.filter(s => !s.audit_id).length;

  return (
    <AppShell
      title="Discovery Queue"
      subtitle={
        newCount > 0
          ? DISCOVERY_QUEUE_COPY.subtitleAwaiting(newCount)
          : DISCOVERY_QUEUE_COPY.subtitleDefault
      }
      actions={(
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end sm:w-auto">
          <button
            type="button"
            onClick={() => {
              const url = buildAbsoluteUrlFromOrigin(DISCOVERY_QUEUE_PAGE_CONFIG.publicDiscoveryPath);
              void navigator.clipboard.writeText(url).then(() => {
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), UI_FEEDBACK_FLASH_MS);
              });
            }}
            className={`glc-touch-target flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium sm:min-h-0 ${
              linkCopied ? 'border-success/40 bg-success/10 text-success' : 'border-info/40 bg-info/10 text-info'
            }`}
          >
            <span key={linkCopied ? 'copied' : 'idle'} className="inline-flex items-center gap-1.5">
              {linkCopied ? (
                <CheckCircle size={12} weight="fill" aria-hidden />
              ) : (
                <Copy size={12} aria-hidden />
              )}
              {linkCopied ? DISCOVERY_QUEUE_COPY.copied : DISCOVERY_QUEUE_COPY.copyLink}
            </span>
          </button>
          <button
            type="button"
            onClick={() => refetchSessions()}
            className="glc-touch-target bg-muted text-muted-foreground flex items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium sm:min-h-0"
          >
            <ArrowsClockwise size={12} /> {DISCOVERY_QUEUE_COPY.refresh}
          </button>
        </div>
      )}
    >
      <div className="glc-page-content max-w-2xl mx-auto space-y-4 mobile:space-y-5">

        {/* Filter tabs */}
        <div className="flex flex-wrap gap-2">
          {(['all', 'new', 'converted'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className={`glc-touch-target rounded-lg border px-3 py-2 text-xs font-semibold capitalize sm:min-h-0 sm:py-1.5 ${
                filter === tab ? 'border-info/50 bg-info/10 text-info' : 'bg-muted text-muted-foreground'
              }`}
            >
              {tab}
              {tab === 'all' && ` (${sessions.length})`}
              {tab === 'new' && ` (${sessions.filter(s => !s.audit_id).length})`}
              {tab === 'converted' && ` (${sessions.filter(s => !!s.audit_id).length})`}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {convertError && (
          <div className="bg-destructive/10 border-destructive/40 mb-4 flex items-center gap-2 rounded-xl border px-4 py-3">
            <Warning size={14} weight="fill" className="text-destructive" />
            <span className="text-destructive text-[13px]">{convertError}</span>
            <button
              type="button"
              onClick={() => setConvertError(null)}
              className="text-muted-foreground ml-auto text-xs"
            >
              {DISCOVERY_QUEUE_COPY.dismiss}
            </button>
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="text-muted-foreground flex items-center justify-center gap-3 py-16">
            <Spinner size={18} className="animate-spin" />
            <span className="text-[13px]">{DISCOVERY_QUEUE_COPY.loadingSessions}</span>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12">
            <Warning size={28} weight="fill" className="text-destructive mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">{error}</p>
            <button
              type="button"
              onClick={() => refetchSessions()}
              className="bg-muted text-muted-foreground mt-4 rounded-lg border px-4 py-2 text-sm font-medium"
            >
              {DISCOVERY_QUEUE_COPY.tryAgain}
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <Users size={32} weight="thin" className="text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              {filter === 'all'
                ? DISCOVERY_QUEUE_COPY.emptyAll
                : DISCOVERY_QUEUE_COPY.emptyFiltered(filter)}
            </p>
          </div>
        )}

        {!loading && !error && filtered.length > 0 && (
          <div className="space-y-3">
            {filtered.map(session => (
              <SessionCard
                key={session.session_token}
                session={session}
                onConvert={handleConvert}
                converting={converting === session.session_token}
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
