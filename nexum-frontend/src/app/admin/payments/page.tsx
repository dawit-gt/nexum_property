'use client';

import { useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { ListFooter, ListToolbar } from '@/components/admin/list-toolbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  listPaymentsForReview,
  getPaymentAdmin,
  reviewPayment,
  type ListPaymentsParams,
} from '@/lib/api/admin-payments';
import { getApiErrorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/lease-utils';
import { toneForStatus } from '@/lib/status-badge';
import { useDebouncedValue, usePaginatedList } from '@/lib/use-paginated-list';
import type { AdminPayment } from '@/types/admin-payment';
import type { PaymentStatus } from '@/types/payment';

type StatusFilter = PaymentStatus | 'ALL';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

export default function AdminPaymentsPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const list = usePaginatedList<AdminPayment, ListPaymentsParams>(
    listPaymentsForReview,
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
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const handleApprove = async (id: string) => {
    setActionError(null);
    setActioningId(id);
    try {
      await reviewPayment(id, 'APPROVED');
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
      await reviewPayment(id, 'REJECTED', reason);
      await list.reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  };

  const handleViewReceipt = async (id: string) => {
    setActionError(null);
    setPreviewLoading(id);
    try {
      const payment = await getPaymentAdmin(id);
      window.open(payment.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setPreviewLoading(null);
    }
  };

  if (guardLoading) return null;

  const error = actionError ?? list.error;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Payments</h1>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by payment #, room, tenant..."
        statusOptions={STATUS_OPTIONS}
        status={status}
        onStatusChange={(v) => setStatus(v as StatusFilter)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />
      <p className="mt-1 text-xs text-slate-400">Dates filter by when the payment was submitted.</p>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {list.isLoading ? (
          <>
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </>
        ) : list.items.length === 0 ? (
          <p className="text-sm text-slate-500">
            {status === 'PENDING' && !search && !dateFrom && !dateTo
              ? 'Nothing pending review.'
              : 'No payments match these filters.'}
          </p>
        ) : (
          list.items.map((p) => (
            <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    Room {p.room.roomNumber} — {Number(p.amount).toLocaleString()} {p.currency}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {p.user.firstName} {p.user.lastName} · {p.user.email}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {p.paymentNumber} · {p.monthsCovered} mo · {formatDate(p.periodStartDate)} –{' '}
                    {formatDate(p.periodEndDate)}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">Submitted {formatDate(p.createdAt)}</p>
                  {p.status === 'REJECTED' && p.rejectionReason ? (
                    <p className="mt-1 text-sm text-red-700">Reason: {p.rejectionReason}</p>
                  ) : null}
                </div>
                <Badge variant={toneForStatus(p.status)}>{p.status}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={previewLoading === p.id}
                  onClick={() => handleViewReceipt(p.id)}
                >
                  {previewLoading === p.id ? 'Loading...' : 'View receipt'}
                </Button>
                {p.status === 'PENDING' ? (
                  <>
                    <Button size="sm" disabled={actioningId === p.id} onClick={() => handleApprove(p.id)}>
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={actioningId === p.id}
                      onClick={() => setRejectTarget(p.id)}
                    >
                      Reject
                    </Button>
                  </>
                ) : null}
              </div>
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
        open={rejectTarget !== null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        onConfirm={(reason) => handleReject(rejectTarget!, reason)}
        title="Reject payment"
      />
    </AdminShell>
  );
}