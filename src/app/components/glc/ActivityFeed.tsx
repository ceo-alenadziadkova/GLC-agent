import { Link } from 'react-router';
import { Pulse } from '@phosphor-icons/react';
import { SectionLabel } from './SectionLabel';
import { formatRelativeTime } from '../../lib/relativeTime';
import type { DashboardActivityEvent } from '../../data/apiService';
import { formatAuditWebsiteDisplay } from '../../data/no-public-website';

interface ActivityFeedProps {
  events: DashboardActivityEvent[] | undefined;
  loading: boolean;
}

function eventPillStyle(eventType: string): React.CSSProperties {
  if (eventType.includes('error') || eventType.includes('fail')) {
    return { backgroundColor: 'rgba(239,68,68,0.1)', color: 'var(--score-1)', border: '1px solid rgba(239,68,68,0.2)' };
  }
  if (eventType.includes('complete') || eventType.includes('done') || eventType.includes('finish')) {
    return { backgroundColor: 'rgba(14,207,130,0.1)', color: 'var(--glc-green)', border: '1px solid rgba(14,207,130,0.2)' };
  }
  if (eventType.includes('review') || eventType.includes('gate')) {
    return { backgroundColor: 'rgba(242,79,29,0.1)', color: 'var(--glc-orange)', border: '1px solid rgba(242,79,29,0.2)' };
  }
  // default — blue
  return { backgroundColor: 'rgba(28,189,255,0.1)', color: 'var(--glc-blue)', border: '1px solid rgba(28,189,255,0.2)' };
}

function truncate(s: string | null, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function ActivityFeed({ events, loading }: ActivityFeedProps) {
  return (
    <div className="glc-card rounded-[var(--radius-xl)] p-5">
      <div className="glc-panel-head">
        <SectionLabel>Recent Activity</SectionLabel>
        <span className="glc-panel-meta">{events?.length ?? 0} events</span>
      </div>

      {loading && !events && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-[var(--bg-canvas)]" />
          ))}
        </div>
      )}

      {!loading && events && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Pulse className="h-7 w-7 text-[var(--text-quaternary)]" />
          <p className="text-sm text-[var(--text-tertiary)]">No pipeline activity yet</p>
        </div>
      )}

      {events && events.length > 0 && (
        <div className="space-y-2.5">
          {events.map(ev => (
            <div key={ev.id} className="glc-hover-row flex items-start gap-3 px-2 py-1.5">
              {/* Event type pill */}
              <span
                className="rounded-md px-1.5 py-0.5 flex-shrink-0 tabular-nums"
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  whiteSpace: 'nowrap',
                  marginTop: 1,
                  ...eventPillStyle(ev.event_type),
                }}
              >
                {ev.event_type.replace(/_/g, ' ')}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <Link
                    to={`/audit/${ev.audit_id}`}
                    className="font-medium"
                    style={{
                      fontSize: 'var(--text-sm)',
                      color: 'var(--text-primary)',
                      textDecoration: 'none',
                      fontFamily: 'var(--font-display)',
                    }}
                  >
                    {ev.company_name ||
                      formatAuditWebsiteDisplay(ev.company_url, ev.no_public_website) ||
                      ev.audit_id.slice(0, 8)}
                  </Link>
                  {ev.message && <span className="text-xs text-[var(--text-secondary)]">— {truncate(ev.message, 80)}</span>}
                </div>
              </div>

              {/* Relative time */}
              <span className="shrink-0 whitespace-nowrap text-xs tabular-nums text-[var(--text-quaternary)]">
                {formatRelativeTime(ev.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
