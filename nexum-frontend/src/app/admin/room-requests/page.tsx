'use client';

import { useEffect, useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { ApproveLeaseDialog } from '@/components/admin/approve-lease-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listRoomRequestsForReview, approveRoomRequest, rejectRoomRequest } from '@/lib/api/admin-room-requests';
import { getApiErrorMessage } from '@/lib/api-client';
import { toneForStatus } from '@/lib/status-badge';
import type { AdminRoomRequest } from '@/types/admin-room-request';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function AdminRoomRequestsPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [requests, setRequests] = useState<AdminRoomRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [approveTarget, setApproveTarget] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    listRoomRequestsForReview()
      .then((all) => setRequests(all.filter((r) => r.status === 'PENDING')))
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleApprove = async (id: string, durationMonths: number) => {
    setActioningId(id);
    try {
      await approveRoomRequest(id, durationMonths);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string, reason: string) => {
    setActioningId(id);
    try {
      await rejectRoomRequest(id, reason);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Room requests</h1>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </>
        ) : requests.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing pending review.</p>
        ) : (
          requests.map((req) => (
            <div key={req.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">
                    Room {req.room.roomNumber} — {Number(req.room.monthlyRent).toLocaleString()} ETB/mo
                  </p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {req.user.firstName} {req.user.lastName} · {req.user.email}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">Desired move-in: {formatDate(req.desiredStartDate)}</p>
                  {req.note ? <p className="mt-1 text-sm text-slate-600">&ldquo;{req.note}&rdquo;</p> : null}
                </div>
                <Badge variant={toneForStatus(req.status)}>{req.status}</Badge>
              </div>

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
            </div>
          ))
        )}
      </div>

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