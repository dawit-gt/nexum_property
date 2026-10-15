'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listMyLeases } from '@/lib/api/leases';
import { listMyPayments } from '@/lib/api/payments';
import { getApiErrorMessage } from '@/lib/api-client';
import { toneForStatus } from '@/lib/status-badge';
import {
  PAYMENT_TONE_STYLES,
  daysUntil,
  formatDate,
  paidThroughFor,
  paymentState,
} from '@/lib/lease-utils';
import type { Lease } from '@/types/lease';
import type { Payment } from '@/types/payment';

export default function LeasesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([listMyLeases(), listMyPayments()])
      .then(([l, p]) => {
        setLeases(l);
        setPayments(p);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [user]);

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-lg font-semibold text-slate-900">My leases</h1>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-36 w-full rounded-xl" />
              <Skeleton className="h-36 w-full rounded-xl" />
            </>
          ) : leases.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
              You don&apos;t have any leases yet.{' '}
              <Link href="/rooms" className="font-medium text-slate-900 underline">
                Browse rooms
              </Link>{' '}
              to request one.
            </div>
          ) : (
            leases.map((lease) => {
              const active = lease.status === 'ACTIVE';
              const state = active ? paymentState(paidThroughFor(lease.id, payments)) : null;
              const daysLeft = active ? daysUntil(lease.endDate) : null;

              return (
                <div key={lease.id} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">Room {lease.room.roomNumber}</p>
                      <p className="mt-0.5 text-xs text-slate-400">{lease.leaseNumber}</p>
                    </div>
                    <Badge variant={toneForStatus(lease.status)}>{lease.status}</Badge>
                  </div>

                  <dl className="space-y-1.5 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Period</dt>
                      <dd className="text-slate-900">
                        {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-slate-500">Monthly rent</dt>
                      <dd className="text-slate-900">{Number(lease.monthlyRent).toLocaleString()} ETB</dd>
                    </div>
                    {daysLeft !== null && daysLeft >= 0 && daysLeft <= 60 ? (
                      <div className="flex justify-between">
                        <dt className="text-slate-500">Lease ends</dt>
                        <dd className="font-medium text-amber-700">
                          in {daysLeft} day{daysLeft === 1 ? '' : 's'}
                        </dd>
                      </div>
                    ) : null}
                    {lease.status === 'TERMINATED' ? (
                      <>
                        {lease.terminationDate ? (
                          <div className="flex justify-between">
                            <dt className="text-slate-500">Terminated on</dt>
                            <dd className="text-slate-900">{formatDate(lease.terminationDate)}</dd>
                          </div>
                        ) : null}
                        {lease.terminationReason ? (
                          <div className="flex justify-between gap-4">
                            <dt className="text-slate-500">Reason</dt>
                            <dd className="text-right text-slate-900">{lease.terminationReason}</dd>
                          </div>
                        ) : null}
                      </>
                    ) : null}
                  </dl>

                  {state ? (
                    <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_TONE_STYLES[state.tone]}`}>
                      {state.label}
                    </span>
                  ) : null}

                  {active ? (
                    <Link href="/payments/new" className="block">
                      <Button className="w-full" variant="outline">
                        Submit a payment
                      </Button>
                    </Link>
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>
    </AppShell>
  );
}