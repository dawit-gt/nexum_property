import { PaymentStatus } from '@prisma/client';

interface LeaseWithLatestApprovedPayment {
  startDate: Date;
  payments: { periodEndDate: Date }[];
}

/**
 * Same logic already used inline in messages.service.ts's
 * GROUP_PAYMENTS_DUE_7_DAYS branch and payments.service.ts's period
 * calculation — factored out here as the canonical version. The other
 * two call sites still have their own inline copies; not worth touching
 * working code just to consolidate, but any future call site should use
 * this one instead of re-deriving it.
 */
export function computeNextDueDate(
  lease: LeaseWithLatestApprovedPayment,
): Date {
  if (lease.payments.length === 0) {
    return lease.startDate;
  }

  const next = new Date(lease.payments[0].periodEndDate);
  next.setDate(next.getDate() + 1);
  return next;
}

export const LATEST_APPROVED_PAYMENT_INCLUDE = {
  payments: {
    where: { status: PaymentStatus.APPROVED },
    orderBy: { periodEndDate: 'desc' as const },
    take: 1,
  },
};
