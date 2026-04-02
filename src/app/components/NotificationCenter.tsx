import { Bell, Check, CheckCircle, FunnelSimple, Lightning, Pulse, X } from '@phosphor-icons/react';
import { formatDistanceToNowStrict } from 'date-fns';
import type { NotificationItem } from '../data/auditTypes';

interface NotificationCenterProps {
  open: boolean;
  notifications: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onRefresh: () => void;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onOpenNotification: (item: NotificationItem) => void;
}

function kindIcon(kind: NotificationItem['kind']) {
  switch (kind) {
    case 'pipeline': return <Pulse size={14} style={{ color: 'var(--glc-blue)' }} />;
    case 'review': return <CheckCircle size={14} style={{ color: 'var(--score-3)' }} />;
    case 'intake': return <FunnelSimple size={14} style={{ color: 'var(--glc-orange)' }} />;
    default: return <Bell size={14} />;
  }
}

function payloadIcon(item: NotificationItem) {
  const failureType = typeof item.payload?.failure_type === 'string' ? item.payload.failure_type : null;
  const artifact = typeof item.payload?.artifact === 'string' ? item.payload.artifact : null;
  const requestId = typeof item.payload?.request_id === 'string' ? item.payload.request_id : null;
  if (failureType) return <Lightning size={14} style={{ color: 'var(--score-1)' }} />;
  if (artifact) return <CheckCircle size={14} style={{ color: 'var(--glc-green)' }} />;
  if (requestId) return <FunnelSimple size={14} style={{ color: 'var(--glc-orange)' }} />;
  return kindIcon(item.kind);
}

export function NotificationCenter({
  open,
  notifications,
  unreadCount,
  loading,
  error,
  onClose,
  onRefresh,
  onMarkAsRead,
  onMarkAllAsRead,
  onOpenNotification,
}: NotificationCenterProps) {
  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        style={{ backgroundColor: 'rgba(2,6,23,0.45)' }}
        onClick={onClose}
      />
      <aside
        className="fixed right-0 top-0 z-50 h-screen w-[380px] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderLeft: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-xl)',
        }}
      >
        <div
          className="px-4 py-3 flex items-center justify-between"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <Bell size={16} style={{ color: 'var(--glc-blue)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{
                  backgroundColor: 'var(--glc-blue-xlight)',
                  color: 'var(--glc-blue)',
                  border: '1px solid rgba(28,189,255,0.25)',
                }}
              >
                {unreadCount}
              </span>
            )}
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-tertiary)' }}><X size={16} /></button>
        </div>

        <div className="px-4 py-2 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <button className="text-xs" style={{ color: 'var(--text-tertiary)' }} onClick={onRefresh}>Refresh</button>
          <button
            className="text-xs flex items-center gap-1"
            style={{ color: unreadCount > 0 ? 'var(--glc-blue)' : 'var(--text-quaternary)' }}
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <Check size={12} /> Mark all read
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && notifications.length === 0 && (
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Loading notifications...</div>
          )}
          {error && (
            <div className="text-xs" style={{ color: 'var(--score-1)' }}>{error}</div>
          )}
          {!loading && notifications.length === 0 && !error && (
            <div className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
              No notifications yet.
            </div>
          )}
          {notifications.map((item) => (
            <button
              key={item.id}
              className="w-full text-left rounded-lg p-3"
              style={{
                backgroundColor: item.is_read ? 'var(--bg-surface)' : 'var(--glc-blue-xlight)',
                border: `1px solid ${item.is_read ? 'var(--border-subtle)' : 'rgba(28,189,255,0.20)'}`,
              }}
              onClick={() => onOpenNotification(item)}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{payloadIcon(item)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                    {item.title}
                  </div>
                  <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                    {item.message}
                  </div>
                  <div className="text-[10px] mt-2" style={{ color: 'var(--text-quaternary)' }}>
                    {formatDistanceToNowStrict(new Date(item.created_at), { addSuffix: true })}
                  </div>
                </div>
                {!item.is_read && (
                  <button
                    className="text-[10px] px-1.5 py-0.5 rounded"
                    style={{ color: 'var(--glc-blue)', border: '1px solid rgba(28,189,255,0.25)' }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkAsRead(item.id);
                    }}
                  >
                    Read
                  </button>
                )}
              </div>
            </button>
          ))}
        </div>
      </aside>
    </>
  );
}
