import { apiGet, apiPatch } from '../api-client';
import type { PaginatedResult } from '@/types/api';
import type { AdminPayment, PaymentWithSignedUrl } from '@/types/admin-payment';
import type { PaymentStatus } from '@/types/payment';
import type { ListParams } from '@/types/list';

export type ListPaymentsParams = ListParams<PaymentStatus>;

export function listPaymentsForReview(params: ListPaymentsParams) {
  return apiGet<PaginatedResult<AdminPayment>>('/payments', params);
}

export function getPaymentAdmin(id: string) {
  return apiGet<PaymentWithSignedUrl>(`/payments/${id}`);
}

export function reviewPayment(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
  return apiPatch(`/payments/${id}/review`, { status, rejectionReason });
}