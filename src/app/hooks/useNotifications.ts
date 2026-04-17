import { useCallback, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { api } from '../data/apiService';
import type { NotificationItem } from '../data/auditTypes';
import { glcKeys } from '../lib/glc-keys';
import { NOTIFICATIONS_CENTER_CONFIG } from '../config/notifications-config';

type NotifData = { items: NotificationItem[]; unreadCount: number };

export function useNotifications() {
  const queryClient = useQueryClient();
  const q = useQuery({
    queryKey: glcKeys.notifications(),
    queryFn: async (): Promise<NotifData> => {
      const [listRes, unreadRes] = await Promise.all([
        api.listNotifications(
          NOTIFICATIONS_CENTER_CONFIG.listPageSize,
          NOTIFICATIONS_CENTER_CONFIG.listOffset,
          false,
        ),
        api.getUnreadNotificationCount(),
      ]);
      return { items: listRes.data, unreadCount: unreadRes.unread };
    },
    staleTime: NOTIFICATIONS_CENTER_CONFIG.staleTimeMs,
  });

  useEffect(() => {
    const channel = supabase
      .channel('notifications-center')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const incoming = payload.new as NotificationItem;
          queryClient.setQueryData<NotifData>(glcKeys.notifications(), (prev) => {
            if (!prev) return prev;
            if (prev.items.some((item) => item.id === incoming.id)) return prev;
            return {
              items: [incoming, ...prev.items].slice(0, NOTIFICATIONS_CENTER_CONFIG.realtimeClientCap),
              unreadCount: incoming.is_read ? prev.unreadCount : prev.unreadCount + 1,
            };
          });
        },
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications' },
        (payload) => {
          const updated = payload.new as NotificationItem;
          queryClient.setQueryData<NotifData>(glcKeys.notifications(), (prev) => {
            if (!prev) return prev;
            const items = prev.items.map((item) => (item.id === updated.id ? updated : item));
            const unreadCount = items.reduce((acc, item) => acc + (item.is_read ? 0 : 1), 0);
            return { items, unreadCount };
          });
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [queryClient]);

  const reload = useCallback(
    async (opts?: { force?: boolean }) => {
      if (opts?.force) {
        await queryClient.invalidateQueries({ queryKey: glcKeys.notifications() });
      } else {
        await q.refetch();
      }
    },
    [queryClient, q],
  );

  const markAsRead = useCallback(
    async (id: string) => {
      queryClient.setQueryData<NotifData>(glcKeys.notifications(), (prev) => {
        if (!prev) return prev;
        const nextItems = prev.items.map((item) =>
          item.id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item,
        );
        const wasUnread = prev.items.some((item) => item.id === id && !item.is_read);
        return {
          items: nextItems,
          unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
        };
      });
      try {
        await api.markNotificationRead(id);
      } catch {
        await queryClient.invalidateQueries({ queryKey: glcKeys.notifications() });
      }
    },
    [queryClient],
  );

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString();
    queryClient.setQueryData<NotifData>(glcKeys.notifications(), (prev) => {
      if (!prev) return prev;
      return {
        items: prev.items.map((item) => ({ ...item, is_read: true, read_at: item.read_at ?? now })),
        unreadCount: 0,
      };
    });
    try {
      await api.markAllNotificationsRead();
    } catch {
      await queryClient.invalidateQueries({ queryKey: glcKeys.notifications() });
    }
  }, [queryClient]);

  return {
    items: q.data?.items ?? [],
    unreadCount: q.data?.unreadCount ?? 0,
    loading: q.isPending && !q.data,
    error: q.error ? (q.error as Error).message : null,
    reload,
    markAsRead,
    markAllAsRead,
  };
}
