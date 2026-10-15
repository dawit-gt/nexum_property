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