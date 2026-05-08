import { Link } from 'react-router';
import { ArrowUpRight, CheckCircle, Warning, XCircle, Clock, Tray } from '@phosphor-icons/react';
import { SectionLabel } from './SectionLabel';
import { formatRelativeTime } from '../../lib/relativeTime';
import { formatAuditWebsiteDisplay } from '../../data/no-public-website';
import type {
  DashboardActionItems,
  DashboardPriority,
  DashboardReviewGateItem,
  DashboardSlaRiskItem,
  DashboardFailureItem,
  DashboardPendingRequestItem,
} from '../../data/apiService';

interface ActionPanelProps {
  items: DashboardActionItems | undefined;
  loading: boolean;
  onRefresh?: () => void;
}

function priorityDot(p: DashboardPriority) {
  const dotClassName: Record<DashboardPriority, string> = {
    high: 'bg-[var(--score-1)]',
    medium: 'bg-[var(--score-3)]',
    low: 'bg-[var(--text-tertiary)]',
  };
  return (
    <span className={`mt-[5px] inline-block h-[6px] w-[6px] shrink-0 rounded-full ${dotClassName[p]}`} />
  );
}

function CompanyAvatar({
  name,
  url,
  noPublicWebsite,
}: {
  name: string | null;
  url: string;
  noPublicWebsite?: boolean;
}) {
  const initials = (name || formatAuditWebsiteDisplay(url, noPublicWebsite)).slice(0, 2).toUpperCase();
  return (
    <div className="ds-action-panel-avatar">
      {initials}
    </div>
  );
}

interface SubSectionProps {
  label: string;
  icon: React.ReactNode;
  count: number;
  children: React.ReactNode;
}

function SubSection({ label, icon, count, children }: SubSectionProps) {
  if (count === 0) return null;
  return (
    <div className="mb-4 last:mb-0">
      <div className="mb-2 flex items-center gap-1.5 text-[length:var(--text-2xs)] font-bold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
        {icon}
        {label}
          <span className="ml-auto rounded-[var(--radius-sm)] border border-[var(--border-subtle)] bg-[var(--bg-canvas)] px-1.5 py-0.5 text-[length:var(--text-2xs)] tabular-nums text-[var(--text-secondary)]">
          {count}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewGateRow({ item }: { item: DashboardReviewGateItem }) {
  return (
    <div className="ds-hover-row flex items-center gap-2.5 group px-2 py-1.5">
      {priorityDot(item.priority)}
      <CompanyAvatar
        name={item.company_name}
        url={item.company_url}
        noPublicWebsite={item.no_public_website}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium [font-family:var(--font-display)] text-[length:var(--text-sm)] text-[var(--text-primary)]">
            {item.company_name || formatAuditWebsiteDisplay(item.company_url, item.no_public_website)}
          </span>
        </div>
        <div className="text-xs text-[var(--text-tertiary)]">
          Waiting at review gate · {formatRelativeTime(item.updated_at)}
        </div>
      </div>
      <Link
        to={`/pipeline/${item.id}`}
        className="ds-action-panel-icon-link mobile:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity ds-touch-target"
        title="Go to pipeline"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function SlaRiskRow({ item }: { item: DashboardSlaRiskItem }) {
  return (
    <div className="ds-hover-row flex items-center gap-2.5 group px-2 py-1.5">
      {priorityDot(item.priority)}
      <CompanyAvatar
        name={item.company_name}
        url={item.company_url}
        noPublicWebsite={item.no_public_website}
      />
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium [font-family:var(--font-display)] text-[length:var(--text-sm)] text-[var(--text-primary)]">
          {item.company_name || formatAuditWebsiteDisplay(item.company_url, item.no_public_website)}
        </div>
        <div className="text-xs text-[var(--text-tertiary)]">
          Not started · {item.days_open}d open
        </div>
      </div>
      <Link
        to={`/pipeline/${item.id}`}
        className="ds-action-panel-icon-link mobile:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity ds-touch-target"
        title="Start pipeline"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function FailureRow({ item }: { item: DashboardFailureItem }) {
  return (
    <div className="ds-hover-row flex items-center gap-2.5 group px-2 py-1.5">
      {priorityDot(item.priority)}
      <CompanyAvatar
        name={item.company_name}
        url={item.company_url}
        noPublicWebsite={item.no_public_website}
      />
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium [font-family:var(--font-display)] text-[length:var(--text-sm)] text-[var(--text-primary)]">
          {item.company_name || formatAuditWebsiteDisplay(item.company_url, item.no_public_website)}
        </div>
        <div className="text-xs text-[var(--text-tertiary)]">
          Pipeline failed · {formatRelativeTime(item.updated_at)}
        </div>
      </div>
      <Link
        to={`/audit/${item.id}`}
        className="ds-action-panel-icon-link mobile:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity ds-touch-target"
        title="View audit"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function PendingRequestRow({ item }: { item: DashboardPendingRequestItem }) {
  return (
    <div className="ds-hover-row flex items-center gap-2.5 group px-2 py-1.5">
      {priorityDot(item.priority)}
      <CompanyAvatar name={null} url={item.url} />
      <div className="flex-1 min-w-0">
        <div className="truncate font-medium [font-family:var(--font-display)] text-[length:var(--text-sm)] text-[var(--text-primary)]">
          {item.url}
        </div>
        <div className="text-xs text-[var(--text-tertiary)]">
          {item.industry || 'Unknown industry'} · submitted {formatRelativeTime(item.created_at)}
        </div>
      </div>
      <Link
        to="/admin/requests"
        className="ds-action-panel-icon-link mobile:opacity-100 opacity-0 group-hover:opacity-100 transition-opacity ds-touch-target"
        title="View request queue"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

export function ActionPanel({ items, loading, onRefresh: _onRefresh }: ActionPanelProps) {
  const totalItems =
    (items?.review_gates.length ?? 0) +
    (items?.sla_risks.length ?? 0) +
    (items?.recent_failures.length ?? 0) +
    (items?.pending_requests.length ?? 0);

  const isEmpty = !loading && items !== undefined && totalItems === 0;

  return (
    <div className="ds-card rounded-[var(--radius-xl)] p-5">
      <div className="ds-panel-head">
        <SectionLabel>Action Required</SectionLabel>
        {totalItems > 0 && (
          <span className="ds-action-panel-count-badge tabular-nums">
            {totalItems}
          </span>
        )}
      </div>
      <p className="ds-panel-meta">Priority queue across review gates, SLA risks, failures, and requests.</p>

      {loading && !items && (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-9 animate-pulse rounded-lg bg-[var(--bg-canvas)]" />
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <CheckCircle className="h-8 w-8 text-[var(--score-5)]" weight="fill" />
          <p className="text-sm font-medium text-[var(--text-secondary)]">No items requiring action</p>
          <p className="text-xs text-[var(--text-tertiary)]">All audits are on track</p>
        </div>
      )}

      {items && totalItems > 0 && (
        <>
          <SubSection
            label="Review gates"
            count={items.review_gates.length}
            icon={<Warning className="w-3 h-3" />}
          >
            {items.review_gates.map(i => <ReviewGateRow key={i.id} item={i} />)}
          </SubSection>

          <SubSection
            label="SLA risk — not started"
            count={items.sla_risks.length}
            icon={<Clock className="w-3 h-3" />}
          >
            {items.sla_risks.map(i => <SlaRiskRow key={i.id} item={i} />)}
          </SubSection>

          <SubSection
            label="Pipeline failures"
            count={items.recent_failures.length}
            icon={<XCircle className="w-3 h-3" />}
          >
            {items.recent_failures.map(i => <FailureRow key={i.id} item={i} />)}
          </SubSection>

          <SubSection
            label="Client requests"
            count={items.pending_requests.length}
            icon={<Tray className="w-3 h-3" />}
          >
            {items.pending_requests.map(i => <PendingRequestRow key={i.id} item={i} />)}
          </SubSection>
        </>
      )}
    </div>
  );
}
