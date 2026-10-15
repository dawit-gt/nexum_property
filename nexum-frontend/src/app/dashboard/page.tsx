'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Building2,
  FileText,
  MessageSquare,
  Receipt,
  Wrench,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { Skeleton } from '@/components/ui/skeleton';
import { listMyLeases } from '@/lib/api/leases';
import { listMyPayments } from '@/lib/api/payments';
import { useUnreadMessageCount } from '@/lib/use-unread-message-count';
import {
  PAYMENT_TONE_STYLES,
  daysUntil,
  formatDate,
  paidThroughFor,
  paymentState,
} from '@/lib/lease-utils';
import type { Lease } from '@/types/lease';
import type { Payment } from '@/types/payment';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const unreadMessages = useUnreadMessageCount();

  const [leases, setLeases] = useState<Lease[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [isLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    Promise.all([listMyLeases(), listMyPayments()])
      .then(([l, p]) => {
        setLeases(l);
        setPayments(p);
      })
      .catch(() => {})
      .finally(() => setDataLoading(false));
  }, [user]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  const activeLeases = leases.filter((l) => l.status === 'ACTIVE');
  const pendingPayments = payments.filter((p) => p.status === 'PENDING').length;

  const actions = [
    { href: '/payments/new', label: 'Submit payment', icon: Receipt, badge: 0 },
    { href: '/rooms', label: 'Browse rooms', icon: Building2, badge: 0 },
    { href: '/maintenance/new', label: 'Report an issue', icon: Wrench, badge: 0 },
    { href: '/messages', label: 'Messages', icon: MessageSquare, badge: unreadMessages },
    { href: '/leases', label: 'My leases', icon: FileText, badge: 0 },
  ];

  return (
    <AppShell>
      <div className="space-y-5 p-4">
        {user.registrationStatus === 'PENDING' ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Your registration is awaiting admin approval. You can browse rooms, but requesting one or submitting a
            payment will be available once you&apos;re approved.{' '}
            <Link href="/profile" className="font-medium underline">
              Check your documents
            </Link>
            .
          </div>
        ) : null}

        {user.registrationStatus === 'REJECTED' ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Your registration was rejected{user.rejectionReason ? `: ${user.rejectionReason}` : '.'}{' '}
            <Link href="/profile" className="font-medium underline">
              Review and re-upload documents
            </Link>
            .
          </div>
        ) : null}

        <h1 className="text-lg font-semibold text-slate-900">Welcome, {user.firstName}</h1>

        {/* Lease status */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">Your rental</h2>

          {dataLoading ? (
            <Skeleton className="h-28 w-full rounded-xl" />
          ) : activeLeases.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm">
              You don&apos;t have an active lease.{' '}
              <Link href="/rooms" className="font-medium text-slate-900 underline">
                Browse available rooms
              </Link>
              .
            </div>
          ) : (
            activeLeases.map((lease) => {
              const state = paymentState(paidThroughFor(lease.id, payments));
              const daysLeft = daysUntil(lease.endDate);

              return (
                <Link
                  key={lease.id}
                  href="/leases"
                  className="block space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium text-slate-900">Room {lease.room.roomNumber}</p>
                    <p className="text-sm text-slate-900">
                      {Number(lease.monthlyRent).toLocaleString()} ETB
                      <span className="text-slate-400"> / month</span>
                    </p>
                  </div>

                  <span className={`inline-block rounded-full px-2.5 py-1 text-xs font-medium ${PAYMENT_TONE_STYLES[state.tone]}`}>
                    {state.label}
                  </span>

                  <p className="text-xs text-slate-500">
                    Lease ends {formatDate(lease.endDate)}
                    {daysLeft >= 0 && daysLeft <= 60 ? ` (in ${daysLeft} day${daysLeft === 1 ? '' : 's'})` : ''}
                  </p>
                </Link>
              );
            })
          )}

          {pendingPayments > 0 ? (
            <Link href="/payments" className="block text-sm text-slate-600 underline">
              {pendingPayments} payment{pendingPayments === 1 ? '' : 's'} awaiting admin review
            </Link>
          ) : null}
        </section>

        {/* Quick actions */}
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-500">Quick actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {actions.map(({ href, label, icon: Icon, badge }) => (
              <Link
                key={href}
                href={href}
                className="relative flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 text-sm font-medium text-slate-900 shadow-sm"
              >
                <Icon className="size-5 text-slate-500" />
                {label}
                {badge > 0 ? (
                  <span className="absolute right-3 top-3 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
                    {badge > 9 ? '9+' : badge}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}