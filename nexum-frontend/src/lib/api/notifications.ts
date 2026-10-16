import { apiGet, apiPatch } from '../api-client';
import type {
  AdminNotificationPreference,
  AppNotification,
  NotificationPreference,
} from '@/types/notification';

export function listMyNotifications(unreadOnly = false) {
  return apiGet<AppNotification[]>('/notifications', unreadOnly ? { unreadOnly: 'true' } : undefined);
}

export function getUnreadCount() {
  return apiGet<{ unreadCount: number }>('/notifications/unread-count');
}

export function markNotificationRead(id: string) {
  return apiPatch(`/notifications/${id}/read`);
}

export function markAllNotificationsRead() {
  return apiPatch('/notifications/mark-all-read');
}

export function getNotificationPreferences() {
  return apiGet<NotificationPreference>('/notifications/preferences');
}

export function updateNotificationPreferences(patch: Partial<NotificationPreference>) {
  return apiPatch<NotificationPreference>('/notifications/preferences', patch);
}

export function getAdminNotificationPreferences() {
  return apiGet<AdminNotificationPreference>('/notifications/admin-preferences');
}

export function updateAdminNotificationPreferences(patch: Partial<AdminNotificationPreference>) {
  return apiPatch<AdminNotificationPreference>('/notifications/admin-preferences', patch);
}
