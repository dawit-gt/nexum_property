import type { PaymentStatus } from './payment';

export interface AdminPayment {
  id: string;
  paymentNumber: string;
  leaseId: string;
  roomId: string;
  amount: string;
  currency: string;
  monthsCovered: number;
  periodStartDate: string;
  periodEndDate: string;
  paymentDate: string;
  paymentMethod: string | null;
  referenceNumber: string | null;
  status: PaymentStatus;
  rejectionReason: string | null;
  note: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  room: { id: string; roomNumber: string };
}

export interface PaymentWithSignedUrl extends Omit<AdminPayment, 'user' | 'room'> {
  signedUrl: string;
  signedUrlExpiresInSeconds: number;
}