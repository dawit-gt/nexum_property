'use client';

import { useEffect, useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { listPaymentsForReview, getPaymentAdmin, reviewPayment } from '@/lib/api/admin-payments';
import { getApiErrorMessage } from '@/lib/api-client';
import { toneForStatus } from '@/lib/status-badge';
import type { AdminPayment } from '@/types/admin-payment';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminPaymentsPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [payments, setPayments] = useState<AdminPayment[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const load = (targetPage: number, reset: boolean) => {
    listPaymentsForReview({ page: targetPage, limit: 10, search: search || undefined, status: 'PENDING' })
      .then((result) => {
        setPayments((prev) => (reset ? result.data : [...prev, ...result.data]));
        setTotalPages(result.meta.totalPages);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));

    queueMicrotask(() => {
      setIsLoading(true);
      setError(null);
    });
  };

  useEffect(() => {
    if (user) load(1, true);
  }, [user, search]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const reloadCurrent = () => load(1, true);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    try {
      await reviewPayment(id, 'APPROVED');
      reloadCurrent();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setActioningId(id);
    try {
      await reviewPayment(id, 'REJECTED', reason);
      reloadCurrent();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  };

  const handleViewReceipt = async (id: string) => {
    setPreviewLoading(id);
    try {
      const payment = await getPaymentAdmin(id);
      window.open(payment.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPreviewLoading(null);
    }
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Payments for review</h1>

      <Input
        className="mt-3 max-w-sm"
        placeholder="Search by payment #, room, tenant..."
        value={search}
        onChange={(e) => handleSearchChange(e.target.value)}
      />

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {payments.map((p) => (
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
                  {p.paymentNumber} · {p.monthsCovered} mo · {formatDate(p.periodStartDate)} – {formatDate(p.periodEndDate)}
                </p>
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
            </div>
          </div>
        ))}

        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}

        {!isLoading && payments.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing pending review.</p>
        ) : null}
      </div>

      {!isLoading && page < totalPages ? (
        <Button
          variant="outline"
          className="mt-4 w-full"
          onClick={() => {
            const next = page + 1;
            setPage(next);
            load(next, false);
          }}
        >
          Load more
        </Button>
      ) : null}

      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        onConfirm={(reason) => handleReject(rejectTarget!, reason)}
        title="Reject payment"
      />
    </AdminShell>
  );
}