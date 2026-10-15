export type PaymentStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface Payment {
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
}