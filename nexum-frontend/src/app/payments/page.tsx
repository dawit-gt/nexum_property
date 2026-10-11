'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listMyPayments } from '@/lib/api/payments';
import { getApiErrorMessage } from '@/lib/api-client';
import { toneForStatus } from '@/lib/status-badge';
import type { Payment } from '@/types/payment';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function PaymentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [payments, setPayments] = useState<Payment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    listMyPayments()
      .then(setPayments)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [user]);

  return (
    <AppShell>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Payments</h1>
          <Button asChild size="sm">
            <Link href="/payments/new">New payment</Link>
          </Button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 space-y-3">
          {isLoading ? (
            <>
              <Skeleton className="h-24 w-full rounded-xl" />
              <Skeleton className="h-24 w-full rounded-xl" />
            </>
          ) : payments.length === 0 ? (
            <p className="text-sm text-slate-500">No payments submitted yet.</p>
          ) : (
            payments.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">
                      {Number(p.amount).toLocaleString()} {p.currency}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">{p.paymentNumber}</p>
                  </div>
                  <Badge variant={toneForStatus(p.status)}>{p.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-slate-500">
                  {p.monthsCovered} month{p.monthsCovered > 1 ? 's' : ''} · {formatDate(p.periodStartDate)} – {formatDate(p.periodEndDate)}
                </p>
                {p.rejectionReason ? <p className="mt-2 text-sm text-red-600">{p.rejectionReason}</p> : null}
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}