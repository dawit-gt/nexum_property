'use client';

import { useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { ApproveLeaseDialog } from '@/components/admin/approve-lease-dialog';
import { ListFooter, ListToolbar } from '@/components/admin/list-toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  listRoomRequestsForReview,
  approveRoomRequest,
  rejectRoomRequest,
  type RoomRequestListParams,
} from '@/lib/api/admin-room-requests';
import { getApiErrorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/lease-utils';
import { toneForStatus } from '@/lib/status-badge';
import { useDebouncedValue, usePaginatedList } from '@/lib/use-paginated-list';
import type { AdminRoomRequest } from '@/types/admin-room-request';
import type { RequestStatus } from '@/types/lease';

type StatusFilter = RequestStatus | 'ALL';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

export default function AdminRoomRequestsPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const list = usePaginatedList<AdminRoomRequest, RoomRequestListParams>(
    listRoomRequestsForReview,
    {
      status,
      search: debouncedSearch.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    { enabled: Boolean(user) },
  );

  const [actionError, setActionError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);

  const handleApprove = async (id: string, durationMonths: number) => {
    setActionError(null);
    setActioningId(id);
    try {
      await approveRoomRequest(id, durationMonths);
      await list.reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setActionError(null);
    setActioningId(id);
    try {
      await rejectRoomRequest(id, reason);
      await list.reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  };

  if (guardLoading) return null;

  const error = actionError ?? list.error;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Room requests</h1>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by room, tenant name, email or note..."
        statusOptions={STATUS_OPTIONS}
        status={status}
        onStatusChange={(v) => setStatus(v as StatusFilter)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {list.isLoading ? (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </>
        ) : list.items.length === 0 ? (
          <p className="text-sm text-slate-500">
            {status === 'PENDING' && !search && !dateFrom && !dateTo
              ? 'Nothing pending review.'
              : 'No room requests match these filters.'}
          </p>
        ) : (
          list.items.map((req) => (
            <div key={req.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    Room {req.room.roomNumber} — {Number(req.room.monthlyRent).toLocaleString()} ETB/mo
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {req.user.firstName} {req.user.lastName} · {req.user.email}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    Desired move-in: {formatDate(req.desiredStartDate)} · requested {formatDate(req.createdAt)}
                  </p>
                  {req.note ? <p className="mt-1 text-sm text-slate-600">&ldquo;{req.note}&rdquo;</p> : null}
                  {req.status === 'REJECTED' && req.rejectionReason ? (
                    <p className="mt-1 text-sm text-red-700">Reason: {req.rejectionReason}</p>
                  ) : null}
                </div>
                <Badge variant={toneForStatus(req.status)}>{req.status}</Badge>
              </div>

              {req.status === 'PENDING' ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button size="sm" disabled={actioningId === req.id} onClick={() => setApproveTarget(req.id)}>
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    disabled={actioningId === req.id}
                    onClick={() => setRejectTarget(req.id)}
                  >
                    Reject
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

      <ApproveLeaseDialog
        open={approveTarget !== null}
        onOpenChange={(open) => !open && setApproveTarget(null)}
        onConfirm={(months) => handleApprove(approveTarget!, months)}
      />
      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        onConfirm={(reason) => handleReject(rejectTarget!, reason)}
        title="Reject room request"
      />
    </AdminShell>
  );
}