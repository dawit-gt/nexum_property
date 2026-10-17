import { apiGet, apiPost } from '../api-client';
import type {
  MessageDeliveryRecipient,
  MessageTargetType,
  SentMessage,
  SmsHandoff,
} from '@/types/message';
import type { NotificationChannel } from '@/types/notification';

export interface BroadcastPayload {
  subject: string;
  body: string;
  targetType: MessageTargetType;
  recipientId?: string;
  recipientIds?: string[];
  propertyId?: string;
  buildingId?: string;
  floorId?: string;
  /** Omit to use each recipient's own preferred channels. */
  channels?: NotificationChannel[];
}

export function sendBroadcast(payload: BroadcastPayload) {
  return apiPost<{ id: string }>('/messages/broadcast', payload);
}

export function listSentMessages() {
  return apiGet<SentMessage[]>('/messages/sent');
}

export function getMessageDeliveries(messageId: string) {
  return apiGet<MessageDeliveryRecipient[]>(`/messages/${messageId}/deliveries`);
}

/** Builds the sms: link and QR code, and marks the delivery as opened for sending. */
export function getSmsHandoff(deliveryId: string) {
  return apiGet<SmsHandoff>(`/notifications/deliveries/${deliveryId}/sms-handoff`);
}
