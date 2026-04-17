import { Bell, Check, CheckCircle, FunnelSimple, Lightning, Pulse, X } from '@phosphor-icons/react';
import { formatDistanceToNowStrict } from 'date-fns';
import type { NotificationItem } from '../data/auditTypes';
import { cn } from './ui/utils';

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
    case 'pipeline': return <Pulse size={14} className="text-info" />;
    case 'review': return <CheckCircle size={14} className="text-warning" />;
    case 'intake': return <FunnelSimple size={14} className="text-orange-500" />;
    default: return <Bell size={14} />;
  }
}

function payloadIcon(item: NotificationItem) {
  const failureType = typeof item.payload?.failure_type === 'string' ? item.payload.failure_type : null;
  const artifact = typeof item.payload?.artifact === 'string' ? item.payload.artifact : null;
  const requestId = typeof item.payload?.request_id === 'string' ? item.payload.request_id : null;
  if (failureType) return <Lightning size={14} className="text-destructive" />;
  if (artifact) return <CheckCircle size={14} className="text-success" />;
  if (requestId) return <FunnelSimple size={14} className="text-orange-500" />;
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
        className="fixed inset-0 z-40 bg-slate-950/45"
        onClick={onClose}
      />
      <aside
        className="bg-card fixed right-0 top-0 z-50 flex h-screen w-[380px] flex-col border-l shadow-xl"
      >
        <div
          className="flex items-center justify-between border-b px-4 py-3"
        >
          <div className="flex items-center gap-2">
            <Bell size={16} className="text-info" />
            <span className="text-foreground text-sm font-semibold">
              Notifications
            </span>
            {unreadCount > 0 && (
              <span
                className="text-info border-info/40 bg-info/10 rounded-full border px-1.5 py-0.5 text-[length:var(--text-2xs)] font-semibold"
              >
                {unreadCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-muted-foreground"><X size={16} /></button>
        </div>

        <div className="flex items-center justify-between border-b px-4 py-2">
          <button className="text-muted-foreground text-xs" onClick={onRefresh}>Refresh</button>
          <button
            className={cn('flex items-center gap-1 text-xs', unreadCount > 0 ? 'text-info' : 'text-muted-foreground')}
            onClick={onMarkAllAsRead}
            disabled={unreadCount === 0}
          >
            <Check size={12} /> Mark all read
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {loading && notifications.length === 0 && (
            <div className="text-muted-foreground text-xs">Loading notifications...</div>
          )}
          {error && (
            <div className="text-destructive text-xs">{error}</div>
          )}
          {!loading && notifications.length === 0 && !error && (
            <div className="text-muted-foreground text-xs">
              No notifications yet.
            </div>
          )}
          {notifications.map((item) => (
            <button
              key={item.id}
              className={cn(
                'w-full rounded-lg border p-3 text-left',
                item.is_read ? 'bg-card' : 'border-info/40 bg-info/10',
              )}
              onClick={() => onOpenNotification(item)}
            >
              <div className="flex items-start gap-2">
                <div className="mt-0.5">{payloadIcon(item)}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-foreground truncate text-xs font-semibold">
                    {item.title}
                  </div>
                  <div className="text-muted-foreground mt-1 text-xs">
                    {item.message}
                  </div>
                  <div className="text-muted-foreground mt-2 text-[length:var(--text-2xs)]">
                    {formatDistanceToNowStrict(new Date(item.created_at), { addSuffix: true })}
                  </div>
                </div>
                {!item.is_read && (
                  <button
                    className="text-info border-info/40 rounded border px-1.5 py-0.5 text-[length:var(--text-2xs)]"
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
