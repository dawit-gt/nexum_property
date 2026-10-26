'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { UserOverview } from '@/components/admin/user-overview';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getUser, reviewRegistration, suspendUser, reactivateUser } from '@/lib/api/admin-users';
import { getApiErrorMessage } from '@/lib/api-client';
import { toneForStatus } from '@/lib/status-badge';
import type { SafeUser } from '@/types/api';

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right text-slate-900">{value || '—'}</dd>
    </div>
  );
}

export default function AdminUserDetailPage() {
  const { userId } = useParams<{ userId: string }>();
  const router = useRouter();
  const { user: admin, isLoading: guardLoading } = useAdminGuard();

  const [person, setPerson] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);

  useEffect(() => {
    if (!admin) return;
    getUser(userId)
      .then(setPerson)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [admin, userId]);

  // For simple buttons: errors show on the page.
  const run = async (action: () => Promise<SafeUser>, successMessage: string) => {
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      setPerson(await action());
      setNotice(successMessage);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  // For dialogs: let errors propagate so the dialog shows them inline and
  // stays open.
  const handleReject = async (reason: string) => {
    setError(null);
    setNotice(null);
    setPerson(await reviewRegistration(userId, 'REJECTED', reason));
    setNotice('Registration rejected');
  };

  const handleSuspend = async (reason: string) => {
    setError(null);
    setNotice(null);
    setPerson(await suspendUser(userId, reason));
    setNotice('Account suspended');
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <button onClick={() => router.back()} className="inline-flex items-center text-sm text-slate-500">
        <ChevronLeft className="size-4" />
        Back
      </button>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-green-700">{notice}</p> : null}

      {isLoading || !person ? (
        <Skeleton className="mt-3 h-40 w-full rounded-xl" />
      ) : (
        <div className="mt-3 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-lg font-semibold text-slate-900">
              {person.firstName} {person.lastName}
            </h1>
            <div className="flex flex-col items-end gap-1">
              <Badge variant={toneForStatus(person.registrationStatus)}>{person.registrationStatus}</Badge>
              {person.role === 'ADMIN' ? <Badge variant="outline">ADMIN</Badge> : null}
              {person.status !== 'ACTIVE' ? <Badge variant="destructive">{person.status}</Badge> : null}
            </div>
          </div>

          {/* Profile */}
          <dl className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <InfoRow label="Email" value={person.email} />
            <InfoRow label="Phone" value={person.phone} />
            <InfoRow label="Telegram" value={person.telegramUsername} />
            <InfoRow label="Address" value={person.address} />
            <InfoRow label="Joined" value={new Date(person.createdAt).toLocaleDateString()} />
          </dl>

          {/* Everything this person has: rooms, requests, documents, payments, tickets */}
          {person.role !== 'ADMIN' ? <UserOverview userId={userId} /> : null}

          {/* Registration */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-medium text-slate-900">Registration</h2>

            {person.registrationStatus === 'APPROVED' ? (
              <p className="text-sm text-slate-500">This registration has been approved.</p>
            ) : (
              <>
                {person.registrationStatus === 'REJECTED' && person.rejectionReason ? (
                  <p className="text-sm text-red-600">Rejected: {person.rejectionReason}</p>
                ) : null}

                <p className="text-sm text-slate-500">
                  Look through the documents listed above, or review them in{' '}
                  <Link href="/admin/documents" className="underline">
                    Documents
                  </Link>
                  , before deciding.
                  {person.registrationStatus === 'REJECTED'
                    ? ' They can upload corrected documents and be re-reviewed.'
                    : ''}
                </p>

                <div className="flex gap-2">
                  <Button
                    disabled={busy}
                    onClick={() => run(() => reviewRegistration(userId, 'APPROVED'), 'Registration approved')}
                  >
                    Approve
                  </Button>
                  {person.registrationStatus === 'PENDING' ? (
                    <Button variant="destructive" disabled={busy} onClick={() => setRejectOpen(true)}>
                      Reject
                    </Button>
                  ) : null}
                </div>
              </>
            )}
          </div>

          {/* Account */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-medium text-slate-900">Account</h2>

            {person.role === 'ADMIN' ? (
              <p className="text-sm text-slate-500">Admin accounts can&apos;t be suspended from here.</p>
            ) : person.status === 'ACTIVE' ? (
              <>
                <p className="text-sm text-slate-500">
                  Suspending blocks this person from logging in and signs out their current session.
                </p>
                <Button variant="destructive" className="w-full" disabled={busy} onClick={() => setSuspendOpen(true)}>
                  Suspend account
                </Button>
              </>
            ) : (
              <>
                <p className="text-sm text-slate-500">This account is {person.status.toLowerCase()}.</p>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={busy}
                  onClick={() => run(() => reactivateUser(userId), 'Account reactivated')}
                >
                  Reactivate account
                </Button>
              </>
            )}
          </div>
        </div>
      )}

      <RejectDialog
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        title="Reject registration"
      />
      <RejectDialog
        open={suspendOpen}
        onOpenChange={setSuspendOpen}
        onConfirm={handleSuspend}
        title="Suspend account"
        confirmLabel="Suspend account"
        pendingLabel="Suspending..."
        placeholder="Reason for suspension (required)"
      />
    </AdminShell>
  );
}
