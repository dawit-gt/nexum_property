import { PaymentStatus } from '@prisma/client';
import { addOneDay } from './date.util';

interface LeaseWithLatestApprovedPayment {
  startDate: Date;
  payments: { periodEndDate: Date }[];
}

/**
 * Same logic already used inline in messages.service.ts's
 * GROUP_PAYMENTS_DUE_7_DAYS branch and payments.service.ts's period
 * calculation — factored out here as the canonical version.
 */
export function computeNextDueDate(
  lease: LeaseWithLatestApprovedPayment,
): Date {
  if (lease.payments.length === 0) {
    return lease.startDate;
  }

  return addOneDay(lease.payments[0].periodEndDate);
}

export const LATEST_APPROVED_PAYMENT_INCLUDE = {
  payments: {
    where: { status: PaymentStatus.APPROVED },
    orderBy: { periodEndDate: 'desc' as const },
    take: 1,
  },
};
