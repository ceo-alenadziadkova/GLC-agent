import { apiFetch } from '../api-http';
import type { DashboardData } from '../api-dashboard-types';
import type { NotificationItem } from '../auditTypes';

export const dashboardNotificationsApi = {
  async getDashboard() {
    return apiFetch<DashboardData>('/api/analytics/dashboard');
  },

  async listNotifications(limit = 30, offset = 0, unreadOnly = false) {
    const q = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      unreadOnly: unreadOnly ? 'true' : 'false',
    });
    return apiFetch<{ data: NotificationItem[]; total: number; limit: number; offset: number }>(
      `/api/notifications?${q.toString()}`,
    );
  },

  async getUnreadNotificationCount() {
    return apiFetch<{ unread: number }>('/api/notifications/unread-count');
  },

  async markNotificationRead(id: string) {
    return apiFetch<{ ok: boolean }>(`/api/notifications/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead() {
    return apiFetch<{ ok: boolean }>('/api/notifications/read-all', { method: 'POST' });
  },
};
