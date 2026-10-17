import type { DeliveryStatus, NotificationChannel } from './notification';

export type MessageTargetType =
  | 'INDIVIDUAL' | 'SELECTED' | 'GROUP_ALL' | 'GROUP_PROPERTY'
  | 'GROUP_BUILDING' | 'GROUP_FLOOR' | 'GROUP_PAYMENTS_DUE_7_DAYS';

export interface SentMessage {
  id: string;
  subject: string;
  body: string;
  targetType: MessageTargetType;
  createdAt: string;
  recipients: { recipientId: string; isRead: boolean }[];
}

export interface InboxItem {
  id: string;
  messageId: string;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
  message: {
    id: string;
    subject: string;
    body: string;
    senderId: string;
    createdAt: string;
    sender: {
      id: string;
      firstName: string;
      lastName: string;
      role: 'ADMIN' | 'USER';
    };
  };
}

export interface MessageDeliveryItem {
  id: string;
  channel: NotificationChannel;
  status: DeliveryStatus;
  errorMessage: string | null;
  attempts: number;
}

export interface MessageDeliveryRecipient {
  notificationId: string;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    phone: string;
    telegramUsername: string | null;
  };
  deliveries: MessageDeliveryItem[];
}

export interface SmsHandoff {
  smsLink: string;
  qrCodeDataUrl: string;
  phone: string;
}