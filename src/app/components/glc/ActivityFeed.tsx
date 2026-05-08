import { useState } from 'react';
import { Link } from 'react-router';
import { CaretDown, Pulse } from '@phosphor-icons/react';
import { SectionLabel } from './SectionLabel';
import { formatRelativeTime } from '../../lib/relativeTime';
import type { DashboardActivityEvent } from '../../data/apiService';
import { formatAuditWebsiteDisplay } from '../../data/no-public-website';
import { cn } from '../ui/utils';

interface ActivityFeedProps {
  events: DashboardActivityEvent[] | undefined;
  loading: boolean;
}

function activityFeedPillVariant(eventType: string): string {
  if (eventType.includes('error') || eventType.includes('fail')) return 'ds-activity-feed-pill--danger';
  if (eventType.includes('complete') || eventType.includes('done') || eventType.includes('finish')) {
    return 'ds-activity-feed-pill--success';
  }
  if (eventType.includes('review') || eventType.includes('gate')) return 'ds-activity-feed-pill--accent';
  return 'ds-activity-feed-pill--default';
}

function truncate(s: string | null, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function ActivityFeed({ events, loading }: ActivityFeedProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="ds-card rounded-[var(--radius-xl)] p-5">
      <div className="ds-panel-head">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md text-left"
          aria-expanded={!collapsed}
          onClick={() => setCollapsed((prev) => !prev)}
        >
          <SectionLabel>Recent Activity</SectionLabel>
          <CaretDown
            className={cn('h-3.5 w-3.5 transition-transform text-[var(--text-tertiary)]', collapsed ? '-rotate-90' : 'rotate-0')}
            aria-hidden
          />
        </button>
        <span className="ds-panel-meta">
          {events?.length ?? 0} events
        </span>
      </div>

      {!collapsed && loading && !events && (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-8 animate-pulse rounded-lg bg-[var(--bg-canvas)]" />
          ))}
        </div>
      )}

      {!collapsed && !loading && events && events.length === 0 && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <Pulse className="h-7 w-7 text-[var(--text-quaternary)]" />
          <p className="text-sm text-[var(--text-tertiary)]">No pipeline activity yet</p>
        </div>
      )}

      {!collapsed && events && events.length > 0 && (
        <div className="space-y-2.5">
          {events.map(ev => (
            <div key={ev.id} className="ds-hover-row flex items-start gap-3 px-2 py-1.5">
              {/* Event type pill */}
              <span
                className={cn(
                  'rounded-md px-1.5 py-0.5 flex-shrink-0 tabular-nums ds-activity-feed-pill',
                  activityFeedPillVariant(ev.event_type),
                )}
              >
                {ev.event_type.replace(/_/g, ' ')}
              </span>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5 flex-wrap">
                  <Link
                    to={`/audit/${ev.audit_id}`}
                    className="font-medium text-[length:var(--text-sm)] text-[var(--text-primary)] no-underline [font-family:var(--font-display)]"
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
