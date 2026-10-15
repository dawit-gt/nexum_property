import type { Payment } from '@/types/payment';

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/** Whole days from today until the given date (negative = in the past). */
export function daysUntil(iso: string) {
  const target = new Date(iso);
  target.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

/** End of the last APPROVED payment period for a lease (same rule as the backend). */
export function paidThroughFor(leaseId: string, payments: Payment[]): string | null {
  let latest: string | null = null;
  for (const p of payments) {
    if (p.leaseId !== leaseId || p.status !== 'APPROVED') continue;
    if (!latest || new Date(p.periodEndDate) > new Date(latest)) {
      latest = p.periodEndDate;
    }
  }
  return latest;
}

export type PaymentTone = 'ok' | 'soon' | 'overdue' | 'none';

export function paymentState(paidThrough: string | null): { tone: PaymentTone; label: string } {
  if (!paidThrough) {
    return { tone: 'none', label: 'No approved payment yet' };
  }

  const days = daysUntil(paidThrough);

  if (days < 0) {
    const late = Math.abs(days);
    return { tone: 'overdue', label: `Overdue by ${late} day${late === 1 ? '' : 's'}` };
  }
  if (days <= 7) {
    return {
      tone: 'soon',
      label: days === 0 ? 'Covered until today' : `Next payment due in ${days} day${days === 1 ? '' : 's'}`,
    };
  }
  return { tone: 'ok', label: `Paid through ${formatDate(paidThrough)}` };
}

export const PAYMENT_TONE_STYLES: Record<PaymentTone, string> = {
  ok: 'bg-green-100 text-green-800',
  soon: 'bg-amber-100 text-amber-800',
  overdue: 'bg-red-100 text-red-800',
  none: 'bg-slate-100 text-slate-700',
};