import { apiGet, apiPostForm } from '../api-client';
import type { Payment } from '@/types/payment';

export function listMyPayments() {
  return apiGet<Payment[]>('/payments/mine');
}

export interface CreatePaymentPayload {
  leaseId: string;
  amount: number;
  monthsCovered: number;
  paymentDate: string;
  paymentMethod?: string;
  referenceNumber?: string;
  note?: string;
  file: File;
}

export function createPayment(payload: CreatePaymentPayload) {
  const formData = new FormData();
  formData.append('leaseId', payload.leaseId);
  formData.append('amount', String(payload.amount));
  formData.append('monthsCovered', String(payload.monthsCovered));
  formData.append('paymentDate', payload.paymentDate);
  if (payload.paymentMethod) formData.append('paymentMethod', payload.paymentMethod);
  if (payload.referenceNumber) formData.append('referenceNumber', payload.referenceNumber);
  if (payload.note) formData.append('note', payload.note);
  formData.append('file', payload.file);
  return apiPostForm<Payment>('/payments', formData);
}