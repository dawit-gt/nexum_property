import { apiGet, apiPost } from '../api-client';
import type { MessageTargetType, SentMessage } from '@/types/message';

export interface BroadcastPayload {
  subject: string;
  body: string;
  targetType: MessageTargetType;
  recipientId?: string;
  recipientIds?: string[];
  propertyId?: string;
  buildingId?: string;
  floorId?: string;
}

export function sendBroadcast(payload: BroadcastPayload) {
  return apiPost<{ id: string }>('/messages/broadcast', payload);
}

export function listSentMessages() {
  return apiGet<SentMessage[]>('/messages/sent');
}