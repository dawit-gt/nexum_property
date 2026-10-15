import { apiGet, apiPatch, apiPost } from '../api-client';
import type { PaginatedResult } from '@/types/api';
import type { InboxItem, SentMessage } from '@/types/message';

export function listInbox(page = 1, limit = 20) {
  return apiGet<PaginatedResult<InboxItem>>('/messages/inbox', { page, limit });
}

export function listMySentMessages() {
  return apiGet<SentMessage[]>('/messages/sent');
}

export function sendMessageToAdmins(subject: string, body: string) {
  return apiPost<{ id: string }>('/messages', { subject, body });
}

export function markMessageRead(messageId: string) {
  return apiPatch(`/messages/${messageId}/read`);
}

export function getUnreadMessageCount() {
  return apiGet<{ unreadCount: number }>('/messages/unread-count');
}