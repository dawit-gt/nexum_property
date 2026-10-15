'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listAllLeases, terminateLease } from '@/lib/api/admin-leases';
import { getApiErrorMessage } from '@/lib/api-client';
import { toneForStatus } from '@/lib/status-badge';
import { formatDate } from '@/lib/lease-utils';
import { cn } from '@/lib/utils';
import type { AdminLease, LeaseStatus } from '@/types/lease';

type Filter = LeaseStatus | 'ALL';
const FILTERS: Filter[] = ['ACTIVE', 'EXPIRED', 'TERMINATED', 'ALL'];

export default function AdminLeasesPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [filter, setFilter] = useState<Filter>('ACTIVE');
  const [leases, setLeases] = useState<AdminLease[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [terminateTarget, setTerminateTarget] = useState<AdminLease | null>(null);

  const load = useCallback(async (f: Filter) => {
    setError(null);
    try {
      setLeases(await listAllLeases(f === 'ALL' ? undefined : f));
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) load(filter);
  }, [user, filter, load]);

  const changeFilter = (f: Filter) => {
    setIsLoading(true);
    setFilter(f);
  };

  const handleTerminate = async (reason: string) => {
    if (!terminateTarget) return;
    await terminateLease(terminateTarget.id, reason);
    setTerminateTarget(null);
    await load(filter);
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Leases</h1>

      <div className="mt-3 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => changeFilter(f)}
            className={cn(
              'rounded-full border px-3 py-1 text-sm',
              filter === f ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </>
        ) : leases.length === 0 ? (
          <p className="text-sm text-slate-500">No leases found.</p>
        ) : (
          leases.map((l) => (
            <div key={l.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    Room {l.room.roomNumber} — {l.user.firstName} {l.user.lastName}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">{l.user.email}</p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {l.leaseNumber} · {formatDate(l.startDate)} – {formatDate(l.endDate)} ·{' '}
                    {Number(l.monthlyRent).toLocaleString()} ETB/mo
                  </p>
                </div>
                <Badge variant={toneForStatus(l.status)}>{l.status}</Badge>
              </div>

              {l.status === 'TERMINATED' && l.terminationReason ? (
                <p className="mt-2 text-sm text-slate-500">
                  Terminated{l.terminationDate ? ` on ${formatDate(l.terminationDate)}` : ''}: {l.terminationReason}
                </p>
              ) : null}

              {l.status === 'ACTIVE' ? (
                <div className="mt-3">
                  <Button variant="destructive" size="sm" onClick={() => setTerminateTarget(l)}>
                    Terminate lease
                  </Button>
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>

      <RejectDialog
        open={terminateTarget !== null}
        onOpenChange={(open) => !open && setTerminateTarget(null)}
        onConfirm={handleTerminate}
        title={
          terminateTarget
            ? `Terminate lease for Room ${terminateTarget.room.roomNumber}?`
            : 'Terminate lease'
        }
        confirmLabel="Terminate lease"
        pendingLabel="Terminating..."
        placeholder="Reason for termination (required). The room will be released to Available."
      />
    </AdminShell>
  );
}