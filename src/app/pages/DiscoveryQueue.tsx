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
import {
  DISCOVERY_QUEUE_FILTER_ORDER,
  DISCOVERY_QUEUE_TAB_PANEL_ID,
  QUEUE_EMPTY_STATE_CONTAINER_CLASS,
  QUEUE_EMPTY_STATE_ICON_CLASS,
  QUEUE_EMPTY_STATE_TEXT_CLASS,
  QUEUE_ERROR_BANNER_CLASS,
  QUEUE_ERROR_BANNER_TEXT_CLASS,
  QUEUE_TAB_BUTTON_ACTIVE_CLASS,
  QUEUE_TAB_BUTTON_BASE_CLASS,
  QUEUE_TAB_BUTTON_INACTIVE_MUTED_CLASS,
  type DiscoveryQueueFilter,
} from './queue-tab-config';
import { buildAbsoluteUrlFromOrigin } from '../lib/public-app-url';
import { formatAppShortDate } from '../lib/date-format';
import { Button } from '../components/ui/button';
import { useTablistKeyboardNavigation } from '../hooks/useTablistKeyboardNavigation';
import { QueueInlineActionLink } from './queue-inline-action-link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';

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
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[length:var(--text-2xs)] font-bold ds-discovery-maturity-tracking ${cfg.toneClass}`}
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
  onDelete,
  deleting,
}: {
  session: DiscoverySession;
  onConvert: (token: string) => void;
  converting: boolean;
  onDelete: () => void;
  deleting: boolean;
}) {
  const highFindings = session.findings.filter(f => f.impact === 'high');
  const date = formatAppShortDate(session.created_at);

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

        <div className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
          {!session.audit_id && (
            <Button
              type="button"
              disabled={converting || deleting}
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

          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={converting || deleting}
            onClick={onDelete}
            className="glc-touch-target text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive sm:min-h-0"
          >
            {deleting ? DISCOVERY_QUEUE_COPY.deleting : DISCOVERY_QUEUE_COPY.deleteSession}
          </Button>
        </div>

        {session.audit_id && (
          <QueueInlineActionLink
            to={`/audit/${session.audit_id}`}
            tone="success"
            variant="outline"
            className="w-full sm:w-auto"
          >
            {DISCOVERY_QUEUE_COPY.openAudit} <ArrowRight size={12} />
          </QueueInlineActionLink>
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
                    className={`mr-1 text-[length:var(--text-2xs)] font-semibold uppercase ds-discovery-zone-caps ${isHigh ? 'text-destructive' : 'text-warning'}`}
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
  const unconvertedSessions = sessions.filter(s => !s.audit_id);
  const loading = q.isPending && !q.data;
  const error = q.error ? DISCOVERY_QUEUE_COPY.loadError : null;

  const [converting, setConverting] = useState<string | null>(null); // token currently converting
  const [deleting, setDeleting] = useState<string | null>(null); // token currently deleting
  const [convertError, setConvertError] = useState<string | null>(null);
  const [filter, setFilter] = useState<DiscoveryQueueFilter>('all');
  const [linkCopied, setLinkCopied] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

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

  async function handleDelete(token: string) {
    setDeleting(token);
    setConvertError(null);
    try {
      await api.deleteDiscoverySession(token);
      queryClient.setQueryData<DiscoverySession[]>(
        glcKeys.discoverySessions(),
        (prev) => (prev ?? []).filter((s) => s.session_token !== token),
      );
    } catch {
      setConvertError(DISCOVERY_QUEUE_COPY.deleteGenericFailure);
    } finally {
      setDeleting(null);
    }
  }

  const filtered = unconvertedSessions;
  const { setTabRef, handleTablistKeyDown } = useTablistKeyboardNavigation({
    order: DISCOVERY_QUEUE_FILTER_ORDER,
    activeKey: filter,
    onChange: (next) => setFilter(next as DiscoveryQueueFilter),
  });

  return (
    <AppShell
      title={DISCOVERY_QUEUE_COPY.title}
      subtitle={
        unconvertedSessions.length > 0
          ? DISCOVERY_QUEUE_COPY.subtitleAwaiting(unconvertedSessions.length)
          : DISCOVERY_QUEUE_COPY.subtitleDefault
      }
      actions={(
        <div className="flex flex-col gap-2 w-full sm:flex-row sm:flex-wrap sm:items-stretch sm:justify-end sm:w-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              const url = buildAbsoluteUrlFromOrigin(DISCOVERY_QUEUE_PAGE_CONFIG.publicDiscoveryPath);
              void navigator.clipboard.writeText(url).then(() => {
                setLinkCopied(true);
                setTimeout(() => setLinkCopied(false), UI_FEEDBACK_FLASH_MS);
              });
            }}
            className={`glc-touch-target sm:min-h-0 ${
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
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetchSessions()}
            className="glc-touch-target bg-muted text-muted-foreground sm:min-h-0"
          >
            <ArrowsClockwise size={12} /> {DISCOVERY_QUEUE_COPY.refresh}
          </Button>
        </div>
      )}
    >
      <div className="glc-page-content max-w-2xl mx-auto space-y-4 mobile:space-y-5">

        {/* Filter tabs */}
        <div
          className="flex flex-wrap gap-2"
          role="tablist"
          aria-label={DISCOVERY_QUEUE_COPY.title}
          onKeyDown={handleTablistKeyDown}
        >
          {DISCOVERY_QUEUE_FILTER_ORDER.map(tab => (
            <button
              ref={setTabRef(tab)}
              key={tab}
              type="button"
              role="tab"
              id={`discovery-queue-tab-${tab}`}
              aria-controls={DISCOVERY_QUEUE_TAB_PANEL_ID}
              aria-selected={filter === tab}
              tabIndex={filter === tab ? 0 : -1}
              onClick={() => setFilter(tab)}
              className={
                `${QUEUE_TAB_BUTTON_BASE_CLASS} font-semibold capitalize ${filter === tab ? QUEUE_TAB_BUTTON_ACTIVE_CLASS : QUEUE_TAB_BUTTON_INACTIVE_MUTED_CLASS}`
              }
            >
              {DISCOVERY_QUEUE_COPY.filters[tab]}
              {tab === 'all' && ` (${unconvertedSessions.length})`}
            </button>
          ))}
        </div>

        <section
          id={DISCOVERY_QUEUE_TAB_PANEL_ID}
          role="tabpanel"
          aria-labelledby={`discovery-queue-tab-${filter}`}
          className="space-y-4"
        >
          {/* Error banner */}
          {convertError && (
            <div className={`${QUEUE_ERROR_BANNER_CLASS} mb-4`}>
              <Warning size={14} weight="fill" className="text-destructive" />
              <span className={QUEUE_ERROR_BANNER_TEXT_CLASS}>{convertError}</span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setConvertError(null)}
                className="ml-auto text-xs text-muted-foreground sm:min-h-0"
              >
                {DISCOVERY_QUEUE_COPY.dismiss}
              </Button>
            </div>
          )}

          {/* Content */}
          {loading && (
            <div className="text-muted-foreground flex items-center justify-center gap-3 py-16">
              <Spinner size={18} className="animate-spin" />
              <span className="text-[length:var(--text-sm)]">{DISCOVERY_QUEUE_COPY.loadingSessions}</span>
            </div>
          )}

          {!loading && error && (
            <div className="text-center py-12">
              <Warning size={28} weight="fill" className="text-destructive mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">{error}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => refetchSessions()}
                className="mt-4 bg-muted text-muted-foreground sm:min-h-0"
              >
                {DISCOVERY_QUEUE_COPY.tryAgain}
              </Button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className={QUEUE_EMPTY_STATE_CONTAINER_CLASS}>
              <Users size={32} weight="thin" className={QUEUE_EMPTY_STATE_ICON_CLASS} />
              <p className={QUEUE_EMPTY_STATE_TEXT_CLASS}>
                {DISCOVERY_QUEUE_COPY.emptyAll}
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
                  onDelete={() => setDeleteTarget(session.session_token)}
                  deleting={deleting === session.session_token}
                />
              ))}
            </div>
          )}
        </section>
        <AlertDialog
          open={deleteTarget !== null}
          onOpenChange={open => {
            if (!open) {
              setDeleteTarget(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{DISCOVERY_QUEUE_COPY.deleteDialogTitle}</AlertDialogTitle>
              <AlertDialogDescription>
                {DISCOVERY_QUEUE_COPY.deleteDialogDescription}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel type="button">
                {DISCOVERY_QUEUE_COPY.deleteDialogCancel}
              </AlertDialogCancel>
              <AlertDialogAction
                type="button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  const target = deleteTarget;
                  setDeleteTarget(null);
                  if (target) {
                    void handleDelete(target);
                  }
                }}
              >
                {DISCOVERY_QUEUE_COPY.deleteDialogConfirm}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AppShell>
  );
}
