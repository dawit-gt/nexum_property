import { apiGet, apiPatch } from '../api-client';
import type { AppNotification } from '@/types/notification';

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