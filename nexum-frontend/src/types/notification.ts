export type NotificationType =
  | 'REGISTRATION' | 'DOCUMENT' | 'ROOM_REQUEST' | 'LEASE' | 'PAYMENT'
  | 'PAYMENT_DUE_ALERT' | 'MAINTENANCE' | 'ANNOUNCEMENT' | 'SYSTEM';

export type NotificationChannel = 'EMAIL' | 'TELEGRAM' | 'SMS' | 'IN_APP' | 'PUSH';
export type DeliveryStatus = 'CREATED' | 'SENT' | 'READ' | 'FAILED' | 'OPENED_FOR_SENDING';

export interface NotificationDelivery {
  id: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
}

export interface AppNotification {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  actionUrl: string | null;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  deliveries: NotificationDelivery[];
}