'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { IncomeChart } from '@/components/charts/income-chart';
import { StatusDonut } from '@/components/charts/status-donut';
import { AdminAlertPreferencesCard } from '@/components/pwa/admin-alert-preferences-card';
import { DeviceSettingsCard } from '@/components/pwa/device-settings-card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardOverview, getMonthlyIncome } from '@/lib/api/dashboard';
import { getApiErrorMessage } from '@/lib/api-client';
import type { DashboardOverview, MonthlyIncomePoint } from '@/types/dashboard';
import { cn } from '@/lib/utils';

const PENDING_ACTION_LINKS: { key: keyof DashboardOverview['pendingActions']; label: string; href: string }[] = [
  { key: 'pendingRegistrations', label: 'Registrations', href: '/admin/users?registrationStatus=PENDING' },
  { key: 'pendingDocuments', label: 'Documents', href: '/admin/documents' },
  { key: 'pendingPayments', label: 'Payments', href: '/admin/payments' },
  { key: 'pendingRoomRequests', label: 'Room requests', href: '/admin/room-requests' },
  { key: 'pendingMaintenance', label: 'Maintenance', href: '/admin/maintenance' },
  { key: 'unreadMessages', label: 'Unread messages', href: '/admin/messages' },
];

const MONTH_CHOICES = [6, 12];

function formatMoney(value: number | null | undefined) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })} ETB`;
}

export default function AdminDashboardPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [months, setMonths] = useState(6);
  const [income, setIncome] = useState<MonthlyIncomePoint[] | null>(null);
  const [incomeError, setIncomeError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    getDashboardOverview()
      .then(setOverview)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    getMonthlyIncome(months)
      .then((data) => {
        if (cancelled) return;
        setIncome(data);
        setIncomeError(null);
      })
      .catch((err) => {
        if (!cancelled) setIncomeError(getApiErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [user, months]);

  if (guardLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  // Prefer overview.thisMonth when present; fall back to the last chart bucket.
  const collectedThisMonth =
    overview?.thisMonth?.totalAmount != null
      ? overview.thisMonth.totalAmount
      : income && income.length > 0
        ? income[income.length - 1].total
        : null;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Dashboard</h1>

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

          <h2 className="mt-6 text-sm font-semibold text-slate-700">Money</h2>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Expected monthly rent</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatMoney(overview.expectedMonthlyRent)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">From active leases</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-sm text-slate-500">Collected this month</p>
              <p className="mt-1 text-xl font-bold text-slate-900">
                {formatMoney(collectedThisMonth)}
              </p>
              <p className="mt-0.5 text-xs text-slate-400">Approved payments</p>
            </div>
          </div>

          <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-slate-500">Income by month</p>
              <div className="flex gap-1">
                {MONTH_CHOICES.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMonths(m)}
                    className={cn(
                      'rounded-full border px-2.5 py-0.5 text-xs',
                      months === m
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-white text-slate-600',
                    )}
                  >
                    {m} months
                  </button>
                ))}
              </div>
            </div>

            {incomeError ? (
              <p className="mt-3 text-sm text-red-600">{incomeError}</p>
            ) : income ? (
              <div className="mt-3">
                <IncomeChart data={income} />
              </div>
            ) : (
              <Skeleton className="mt-3 h-56 w-full rounded-lg" />
            )}
          </div>

          <h2 className="mt-6 text-sm font-semibold text-slate-700">Analytics</h2>
          <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <StatusDonut title="Room occupancy" data={overview.occupancy} />
            <StatusDonut title="Payment status" data={overview.payments} />
            <StatusDonut title="User status" data={overview.users} />
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