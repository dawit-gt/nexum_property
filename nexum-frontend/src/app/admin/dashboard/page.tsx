'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { AdminAlertPreferencesCard } from '@/components/pwa/admin-alert-preferences-card';
import { DeviceSettingsCard } from '@/components/pwa/device-settings-card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardOverview } from '@/lib/api/dashboard';
import { downloadPaymentsCsv } from '@/lib/api/admin-leases';
import { getApiErrorMessage } from '@/lib/api-client';
import type { DashboardOverview } from '@/types/dashboard';
import { cn } from '@/lib/utils';

const PENDING_ACTION_LINKS: { key: keyof DashboardOverview['pendingActions']; label: string; href: string }[] = [
  { key: 'pendingRegistrations', label: 'Registrations', href: '/admin/users?registrationStatus=PENDING' },
  { key: 'pendingDocuments', label: 'Documents', href: '/admin/documents' },
  { key: 'pendingPayments', label: 'Payments', href: '/admin/payments' },
  { key: 'pendingRoomRequests', label: 'Room requests', href: '/admin/room-requests' },
  { key: 'pendingMaintenance', label: 'Maintenance', href: '/admin/maintenance' },
  { key: 'unreadMessages', label: 'Unread messages', href: '/admin/messages' },
];

function StatCard({ title, data }: { title: string; data: Record<string, number> }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <dl className="mt-2 space-y-1.5">
        {Object.entries(data).map(([status, count]) => (
          <div key={status} className="flex items-center justify-between text-sm">
            <dt className="text-slate-600">{status}</dt>
            <dd className="font-semibold text-slate-900">{count}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getDashboardOverview()
      .then(setOverview)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [user]);

  if (guardLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <AdminShell>
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>
        <Button
          variant="outline"
          size="sm"
          onClick={() => downloadPaymentsCsv().catch((err) => setError(getApiErrorMessage(err)))}
        >
          Export payments CSV
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {isLoading || !overview ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-xl" />
          ))}
        </div>
      ) : (
        <>
          <h2 className="mt-6 text-sm font-semibold text-slate-700">Pending actions</h2>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {PENDING_ACTION_LINKS.map(({ key, label, href }) => {
              const count = overview.pendingActions[key] as number;
              return (
                <Link
                  key={key}
                  href={href}
                  className={cn(
                    'rounded-xl border p-4 shadow-sm transition-colors',
                    count > 0 ? 'border-slate-300 bg-white' : 'border-slate-200 bg-white',
                  )}
                >
                  <p className="text-2xl font-bold text-slate-900">{count}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{label}</p>
                </Link>
              );
            })}
          </div>

          <h2 className="mt-6 text-sm font-semibold text-slate-700">Analytics</h2>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatCard title="Room occupancy" data={overview.occupancy} />
            <StatCard title="Payment status" data={overview.payments} />
            <StatCard title="User status" data={overview.users} />
          </div>
        </>
      )}

      <h2 className="mt-6 text-sm font-semibold text-slate-700">App &amp; notifications</h2>
      <div className="mt-2 space-y-3">
        <DeviceSettingsCard />
        <AdminAlertPreferencesCard />
      </div>
    </AdminShell>
  );
}
