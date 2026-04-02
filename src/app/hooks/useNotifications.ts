import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { api } from '../data/apiService';
import type { NotificationItem } from '../data/auditTypes';

interface NotificationsState {
  items: NotificationItem[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

export function useNotifications() {
  const [state, setState] = useState<NotificationsState>({
    items: [],
    unreadCount: 0,
    loading: false,
    error: null,
  });

  const reload = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true }));
    try {
      const [listRes, unreadRes] = await Promise.all([
        api.listNotifications(30, 0, false),
        api.getUnreadNotificationCount(),
      ]);
      setState({
        items: listRes.data,
        unreadCount: unreadRes.unread,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: (err as Error).message,
      }));
    }
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    setState((prev) => {
      const nextItems = prev.items.map((item) =>
        item.id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item,
      );
      const wasUnread = prev.items.some((item) => item.id === id && !item.is_read);
      return {
        ...prev,
        items: nextItems,
        unreadCount: wasUnread ? Math.max(0, prev.unreadCount - 1) : prev.unreadCount,
      };
    });
    try {
      await api.markNotificationRead(id);
    } catch {
      await reload();
    }
  }, [reload]);

  const markAllAsRead = useCallback(async () => {
    const now = new Date().toISOString();
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) => ({ ...item, is_read: true, read_at: item.read_at ?? now })),
      unreadCount: 0,
    }));
    try {
      await api.markAllNotificationsRead();
    } catch {
      await reload();
    }
  }, [reload]);

  useEffect(() => {
    reload();

    const channel = supabase
      .channel('notifications-center')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications' },
        (payload) => {
          const incoming = payload.new as NotificationItem;
          setState((prev) => {
            if (prev.items.some((item) => item.id === incoming.id)) return prev;
            return {
              ...prev,
              items: [incoming, ...prev.items].slice(0, 50),
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
          setState((prev) => ({
            ...prev,
            items: prev.items.map((item) => (item.id === updated.id ? updated : item)),
            unreadCount: prev.items.reduce((acc, item) => {
              const source = item.id === updated.id ? updated : item;
              return acc + (source.is_read ? 0 : 1);
            }, 0),
          }));
        },
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [reload]);

  return {
    ...state,
    reload,
    markAsRead,
    markAllAsRead,
  };
}
