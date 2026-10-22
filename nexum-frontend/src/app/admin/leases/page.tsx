'use client';

import { useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { ListFooter, ListToolbar } from '@/components/admin/list-toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listLeases, terminateLease, type LeaseListParams } from '@/lib/api/admin-leases';
import { formatDate } from '@/lib/lease-utils';
import { toneForStatus } from '@/lib/status-badge';
import { useDebouncedValue, usePaginatedList } from '@/lib/use-paginated-list';
import type { AdminLease, LeaseStatus } from '@/types/lease';

type StatusFilter = LeaseStatus | 'ALL';

const STATUS_OPTIONS = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'EXPIRED', label: 'Expired' },
  { value: 'TERMINATED', label: 'Terminated' },
  { value: 'ALL', label: 'All' },
];

export default function AdminLeasesPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('ACTIVE');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const list = usePaginatedList<AdminLease, LeaseListParams>(
    listLeases,
    {
      status,
      search: debouncedSearch.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    { enabled: Boolean(user) },
  );

  const [terminateTarget, setTerminateTarget] = useState<AdminLease | null>(null);

  const handleTerminate = async (reason: string) => {
    if (!terminateTarget) return;
    await terminateLease(terminateTarget.id, reason);
    setTerminateTarget(null);
    await list.reload();
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Leases</h1>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by lease #, room, tenant name or email..."
        statusOptions={STATUS_OPTIONS}
        status={status}
        onStatusChange={(v) => setStatus(v as StatusFilter)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {list.error ? <p className="mt-3 text-sm text-red-600">{list.error}</p> : null}

      <div className="mt-4 space-y-3">
        {list.isLoading ? (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </>
        ) : list.items.length === 0 ? (
          <p className="text-sm text-slate-500">No leases match these filters.</p>
        ) : (
          list.items.map((l) => (
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

      <ListFooter
        shown={list.items.length}
        total={list.total}
        hasMore={list.hasMore}
        isLoadingMore={list.isLoadingMore}
        onLoadMore={list.loadMore}
      />

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