import { API_PATHS } from '../../config/api-paths';
import { apiFetch } from '../api-http';
import type { DashboardData } from '../api-dashboard-types';
import type { NotificationItem } from '../auditTypes';

export const dashboardNotificationsApi = {
  async getDashboard() {
    return apiFetch<DashboardData>(API_PATHS.analyticsDashboard);
  },

  async listNotifications(limit = 30, offset = 0, unreadOnly = false) {
    const q = new URLSearchParams({
      limit: String(limit),
      offset: String(offset),
      unreadOnly: unreadOnly ? 'true' : 'false',
    });
    return apiFetch<{ data: NotificationItem[]; total: number; limit: number; offset: number }>(
      `${API_PATHS.notifications}?${q.toString()}`,
    );
  },

  async getUnreadNotificationCount() {
    return apiFetch<{ unread: number }>(API_PATHS.notificationsUnreadCount);
  },

  async markNotificationRead(id: string) {
    return apiFetch<{ ok: boolean }>(`${API_PATHS.notifications}/${id}/read`, { method: 'POST' });
  },

  async markAllNotificationsRead() {
    return apiFetch<{ ok: boolean }>(API_PATHS.notificationsReadAll, { method: 'POST' });
  },
};
