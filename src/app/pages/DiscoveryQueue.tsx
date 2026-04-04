/**
 * Discovery Queue — consultant-only view of Mode C submissions.
 *
 * Lists discovery_sessions ordered by created_at DESC.
 * Allows "Convert to audit" which creates a full audit from the session.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router';
import {
  ChartBar, Users, Warning, Lightbulb, ArrowRight,
  CheckCircle, Spinner, ArrowsClockwise, UserCircle,
  EnvelopeSimple, Phone, Calendar, Copy,
} from '@phosphor-icons/react';
import { api } from '../data/apiService';
import { AppShell } from '../components/AppShell';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiscoverySession {
  session_token:   string;
  maturity_level:  number;
  findings:        Array<{ id: string; zone: string; headline: string; impact: string }>;
  contact_name:    string | null;
  contact_email:   string | null;
  contact_phone:   string | null;
  audit_id:        string | null;
  created_at:      string;
  biz_description: string | null;
  industry:        string | null;
}

// ── Maturity helpers ──────────────────────────────────────────────────────────

const MATURITY_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: 'Early-stage',   color: '#EF4444' },
  2: { label: 'Developing',    color: '#F97316' },
  3: { label: 'Intermediate',  color: '#F59E0B' },
  4: { label: 'Advanced',      color: '#10B981' },
};

function MaturityPill({ level }: { level: number }) {
  const cfg = MATURITY_CONFIG[level] ?? { label: `Level ${level}`, color: '#6B7280' };
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold"
      style={{
        background: `${cfg.color}18`,
        border: `1px solid ${cfg.color}40`,
        color: cfg.color,
        letterSpacing: '0.03em',
      }}
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
    <div
      className="rounded-2xl p-5 space-y-4"
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: session.audit_id
          ? '1px solid rgba(16,185,129,0.22)'
          : '1px solid rgba(255,255,255,0.09)',
      }}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <MaturityPill level={session.maturity_level} />
            {session.audit_id && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                style={{ background: 'rgba(16,185,129,0.10)', border: '1px solid rgba(16,185,129,0.28)', color: '#10B981' }}
              >
                <CheckCircle size={10} weight="fill" /> Converted
              </span>
            )}
          </div>
          <div className="flex items-center gap-1" style={{ color: 'rgba(255,255,255,0.35)', fontSize: 11 }}>
            <Calendar size={11} />
            <span>{date}</span>
          </div>
        </div>

        {!session.audit_id && (
          <button
            type="button"
            disabled={converting}
            onClick={() => onConvert(session.session_token)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold flex-shrink-0"
            style={{
              background: converting ? 'rgba(255,255,255,0.08)' : 'linear-gradient(135deg, #1CBDFF, #0066CC)',
              color: converting ? 'rgba(255,255,255,0.35)' : '#fff',
              border: 'none',
              cursor: converting ? 'not-allowed' : 'pointer',
              boxShadow: converting ? 'none' : '0 3px 10px rgba(28,189,255,0.28)',
            }}
          >
            {converting
              ? <><Spinner size={13} className="animate-spin" /> Creating…</>
              : <>Convert to audit <ArrowRight size={13} /></>}
          </button>
        )}

        {session.audit_id && (
          <a
            href={`/audit/${session.audit_id}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold"
            style={{
              background: 'rgba(16,185,129,0.10)',
              border: '1px solid rgba(16,185,129,0.25)',
              color: '#10B981',
              textDecoration: 'none',
            }}
          >
            Open audit <ArrowRight size={12} />
          </a>
        )}
      </div>

      {/* Business identity — contact details if provided, else biz_description + industry */}
      <div
        className="rounded-xl px-3 py-2 space-y-1.5"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)' }}
      >
        {/* Contact info row */}
        {(session.contact_name || session.contact_email || session.contact_phone) ? (
          <div className="flex flex-wrap gap-x-4 gap-y-1">
            {session.contact_name && (
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>
                <UserCircle size={13} style={{ color: 'rgba(28,189,255,0.70)' }} />
                {session.contact_name}
              </span>
            )}
            {session.contact_email && (
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>
                <EnvelopeSimple size={13} style={{ color: 'rgba(28,189,255,0.70)' }} />
                {session.contact_email}
              </span>
            )}
            {session.contact_phone && (
              <span className="flex items-center gap-1.5" style={{ fontSize: 12, color: 'rgba(255,255,255,0.70)' }}>
                <Phone size={13} style={{ color: 'rgba(28,189,255,0.70)' }} />
                {session.contact_phone}
              </span>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.30)', fontStyle: 'italic' }}>
            No contact info provided
          </p>
        )}

        {/* Business description / industry (always show when present — gives context for no-contact sessions) */}
        {(session.biz_description || session.industry) && (
          <div className="space-y-0.5" style={{ borderTop: (session.contact_name || session.contact_email || session.contact_phone) ? '1px solid rgba(255,255,255,0.06)' : 'none', paddingTop: (session.contact_name || session.contact_email || session.contact_phone) ? 6 : 0 }}>
            {session.industry && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.40)' }}>
                <span style={{ color: 'rgba(255,255,255,0.28)', marginRight: 4 }}>Industry</span>
                {session.industry}
              </p>
            )}
            {session.biz_description && (
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', lineHeight: 1.5 }}>
                {session.biz_description.length > 120
                  ? `${session.biz_description.slice(0, 117)}…`
                  : session.biz_description}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Top findings */}
      {session.findings.length > 0 && (
        <div className="space-y-1.5">
          {session.findings.slice(0, 3).map(f => {
            const isHigh = f.impact === 'high';
            return (
              <div key={f.id} className="flex items-start gap-2">
                {isHigh
                  ? <Warning size={12} weight="fill" className="mt-0.5 flex-shrink-0" style={{ color: '#EF4444' }} />
                  : <Lightbulb size={12} weight="fill" className="mt-0.5 flex-shrink-0" style={{ color: '#F59E0B' }} />}
                <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.60)', lineHeight: 1.5 }}>
                  <span
                    className="font-semibold mr-1"
                    style={{ color: isHigh ? '#EF4444' : '#F59E0B', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}
                  >
                    {f.zone}
                  </span>
                  {f.headline}
                </span>
              </div>
            );
          })}
          {session.findings.length > 3 && (
            <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.28)', paddingLeft: 16 }}>
              +{session.findings.length - 3} more finding{session.findings.length - 3 > 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
      {highFindings.length === 0 && session.findings.length === 0 && (
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)' }}>No findings recorded</p>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DiscoveryQueue() {
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<DiscoverySession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState<string | null>(null); // token currently converting
  const [convertError, setConvertError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'converted'>('all');
  const [linkCopied, setLinkCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { sessions: data } = await api.listDiscoverySessions();
      setSessions(data as DiscoverySession[]);
    } catch {
      setError('Failed to load discovery sessions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  async function handleConvert(token: string) {
    setConverting(token);
    setConvertError(null);
    try {
      const { audit_id } = await api.convertDiscoverySession(token);
      // Update local state immediately
      setSessions(prev =>
        prev.map(s => s.session_token === token ? { ...s, audit_id } : s),
      );
      navigate(`/pipeline/${audit_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setConvertError(msg.includes('already converted')
        ? 'This session was already converted to an audit.'
        : 'Failed to create audit — please try again.');
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
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ChartBar size={18} weight="bold" style={{ color: '#1CBDFF' }} />
              <h1 className="font-bold" style={{ fontSize: 20, color: '#fff', letterSpacing: '-0.02em' }}>
                Discovery Queue
              </h1>
              {newCount > 0 && (
                <span
                  className="inline-flex items-center justify-center rounded-full text-[10px] font-bold px-2 py-0.5"
                  style={{ background: 'rgba(28,189,255,0.18)', color: '#1CBDFF', border: '1px solid rgba(28,189,255,0.35)' }}
                >
                  {newCount} new
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,0.45)' }}>
              Mode C submissions from the public discovery questionnaire
            </p>
          </div>
            <div className="flex items-center gap-2">
            {/* Copy public discover link */}
            <button
              type="button"
              onClick={() => {
                const url = `${window.location.origin}/audit/discover`;
                void navigator.clipboard.writeText(url).then(() => {
                  setLinkCopied(true);
                  setTimeout(() => setLinkCopied(false), 2000);
                });
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: linkCopied ? 'rgba(16,185,129,0.12)' : 'rgba(28,189,255,0.08)',
                border: linkCopied ? '1px solid rgba(16,185,129,0.30)' : '1px solid rgba(28,189,255,0.22)',
                color: linkCopied ? '#10B981' : 'rgba(28,189,255,0.80)',
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              {/* Keyed wrapper avoids DOM reconcile edge cases with sidebar layout updates + icon swap */}
              <span key={linkCopied ? 'copied' : 'idle'} className="inline-flex items-center gap-1.5">
                {linkCopied ? (
                  <CheckCircle size={12} weight="fill" aria-hidden />
                ) : (
                  <Copy size={12} aria-hidden />
                )}
                {linkCopied ? 'Copied!' : 'Copy discover link'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => void load()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.55)',
                cursor: 'pointer',
              }}
            >
              <ArrowsClockwise size={12} /> Refresh
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 mb-5">
          {(['all', 'new', 'converted'] as const).map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilter(tab)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize"
              style={{
                background: filter === tab ? 'rgba(28,189,255,0.15)' : 'rgba(255,255,255,0.05)',
                border: filter === tab ? '1px solid rgba(28,189,255,0.35)' : '1px solid rgba(255,255,255,0.08)',
                color: filter === tab ? '#1CBDFF' : 'rgba(255,255,255,0.45)',
                cursor: 'pointer',
              }}
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
          <div
            className="flex items-center gap-2 px-4 py-3 rounded-xl mb-4"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)' }}
          >
            <Warning size={14} weight="fill" style={{ color: '#EF4444' }} />
            <span style={{ fontSize: 13, color: 'rgba(239,68,68,0.90)' }}>{convertError}</span>
            <button
              type="button"
              onClick={() => setConvertError(null)}
              style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'rgba(239,68,68,0.60)', cursor: 'pointer', fontSize: 12 }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content */}
        {loading && (
          <div className="flex items-center justify-center py-16 gap-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
            <Spinner size={18} className="animate-spin" />
            <span style={{ fontSize: 13 }}>Loading sessions…</span>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12">
            <Warning size={28} weight="fill" className="mx-auto mb-3" style={{ color: 'rgba(239,68,68,0.50)' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.50)' }}>{error}</p>
            <button
              type="button"
              onClick={() => void load()}
              className="mt-4 px-4 py-2 rounded-lg text-sm font-medium"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.60)',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && filtered.length === 0 && (
          <div className="text-center py-16">
            <Users size={32} weight="thin" className="mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.20)' }} />
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)' }}>
              {filter === 'all'
                ? 'No discovery sessions yet. Use "Copy discover link" above to share the questionnaire.'
                : `No ${filter} sessions.`}
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
