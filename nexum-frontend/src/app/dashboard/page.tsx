'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';

export default function DashboardPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center px-4">
        <p className="text-sm text-slate-500">Loading...</p>
      </div>
    );
  }

  return (
    <AppShell>
      <div className="p-4">
        {user.registrationStatus === 'PENDING' ? (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Your registration is awaiting admin approval. You can browse rooms, but requesting one or submitting a
            payment will be available once you&apos;re approved.
          </div>
        ) : null}

        {user.registrationStatus === 'REJECTED' ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            Your registration was rejected{user.rejectionReason ? `: ${user.rejectionReason}` : '.'} Contact an
            administrator for next steps.
          </div>
        ) : null}

        <h1 className="text-lg font-semibold text-slate-900">
          Welcome, {user.firstName}
        </h1>

        <dl className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-white p-4 text-sm shadow-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Email</dt>
            <dd className="text-slate-900">{user.email}</dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-slate-500">Role</dt>
            <dd className="text-slate-900">{user.role}</dd>
          </div>

          <div className="flex justify-between">
            <dt className="text-slate-500">Registration status</dt>
            <dd className="text-slate-900">
              {user.registrationStatus}
            </dd>
          </div>
        </dl>
      </div>
    </AppShell>
  );
}