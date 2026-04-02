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
  const colors: Record<DashboardPriority, string> = {
    high:   'var(--score-1)',
    medium: 'var(--score-3)',
    low:    'var(--text-tertiary)',
  };
  return (
    <span
      className="inline-block flex-shrink-0 rounded-full"
      style={{ width: 6, height: 6, backgroundColor: colors[p], marginTop: 5 }}
    />
  );
}

function CompanyAvatar({ name, url }: { name: string | null; url: string }) {
  const initials = (name || formatAuditWebsiteDisplay(url)).slice(0, 2).toUpperCase();
  return (
    <div
      className="w-7 h-7 flex items-center justify-center text-xs font-bold flex-shrink-0"
      style={{
        background: 'linear-gradient(135deg, var(--glc-blue-xlight) 0%, rgba(28,189,255,0.06) 100%)',
        color: 'var(--glc-blue-deeper)',
        border: '1px solid rgba(28,189,255,0.14)',
        borderRadius: 'var(--radius-md)',
        fontFamily: 'var(--font-display)',
        fontSize: '10px',
      }}
    >
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
      <div
        className="flex items-center gap-1.5 mb-2"
        style={{ color: 'var(--text-tertiary)', fontSize: '10px', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}
      >
        {icon}
        {label}
        <span
          className="ml-auto tabular-nums px-1.5 py-0.5"
          style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '10px',
            color: 'var(--text-secondary)',
          }}
        >
          {count}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function ReviewGateRow({ item }: { item: DashboardReviewGateItem }) {
  return (
    <div className="flex items-center gap-2.5 group">
      {priorityDot(item.priority)}
      <CompanyAvatar name={item.company_name} url={item.company_url} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span
            className="font-medium truncate"
            style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
          >
            {item.company_name || formatAuditWebsiteDisplay(item.company_url)}
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          Waiting at review gate · {formatRelativeTime(item.updated_at)}
        </div>
      </div>
      <Link
        to={`/pipeline/${item.id}`}
        className="glc-btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 26, height: 26, borderRadius: 'var(--radius-md)', flexShrink: 0 }}
        title="Go to pipeline"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function SlaRiskRow({ item }: { item: DashboardSlaRiskItem }) {
  return (
    <div className="flex items-center gap-2.5 group">
      {priorityDot(item.priority)}
      <CompanyAvatar name={item.company_name} url={item.company_url} />
      <div className="flex-1 min-w-0">
        <div
          className="font-medium truncate"
          style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {item.company_name || formatAuditWebsiteDisplay(item.company_url)}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          Not started · {item.days_open}d open
        </div>
      </div>
      <Link
        to={`/pipeline/${item.id}`}
        className="glc-btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 26, height: 26, borderRadius: 'var(--radius-md)', flexShrink: 0 }}
        title="Start pipeline"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function FailureRow({ item }: { item: DashboardFailureItem }) {
  return (
    <div className="flex items-center gap-2.5 group">
      {priorityDot(item.priority)}
      <CompanyAvatar name={item.company_name} url={item.company_url} />
      <div className="flex-1 min-w-0">
        <div
          className="font-medium truncate"
          style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {item.company_name || formatAuditWebsiteDisplay(item.company_url)}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          Pipeline failed · {formatRelativeTime(item.updated_at)}
        </div>
      </div>
      <Link
        to={`/audit/${item.id}`}
        className="glc-btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 26, height: 26, borderRadius: 'var(--radius-md)', flexShrink: 0 }}
        title="View audit"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

function PendingRequestRow({ item }: { item: DashboardPendingRequestItem }) {
  return (
    <div className="flex items-center gap-2.5 group">
      {priorityDot(item.priority)}
      <CompanyAvatar name={null} url={item.url} />
      <div className="flex-1 min-w-0">
        <div
          className="font-medium truncate"
          style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)', fontFamily: 'var(--font-display)' }}
        >
          {item.url}
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
          {item.industry || 'Unknown industry'} · submitted {formatRelativeTime(item.created_at)}
        </div>
      </div>
      <Link
        to="/admin/requests"
        className="glc-btn-icon opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ width: 26, height: 26, borderRadius: 'var(--radius-md)', flexShrink: 0 }}
        title="View request queue"
      >
        <ArrowUpRight className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
}

export function ActionPanel({ items, loading, onRefresh }: ActionPanelProps) {
  const totalItems =
    (items?.review_gates.length ?? 0) +
    (items?.sla_risks.length ?? 0) +
    (items?.recent_failures.length ?? 0) +
    (items?.pending_requests.length ?? 0);

  const isEmpty = !loading && items !== undefined && totalItems === 0;

  return (
    <div
      className="glc-card p-5"
      style={{ borderRadius: 'var(--radius-xl)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <SectionLabel>Action Required</SectionLabel>
        {totalItems > 0 && (
          <span
            className="tabular-nums px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              backgroundColor: 'rgba(239,68,68,0.1)',
              color: 'var(--score-1)',
              border: '1px solid rgba(239,68,68,0.2)',
            }}
          >
            {totalItems}
          </span>
        )}
      </div>

      {loading && !items && (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-9 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--bg-canvas)' }} />
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-8 gap-2">
          <CheckCircle className="w-8 h-8" style={{ color: 'var(--glc-green)' }} weight="fill" />
          <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>No items requiring action</p>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>All audits are on track</p>
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
