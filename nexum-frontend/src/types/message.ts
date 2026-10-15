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