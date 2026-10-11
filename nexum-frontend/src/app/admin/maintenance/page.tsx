'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { MaintenanceStatusDialog } from '@/components/admin/maintenance-status-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { listMaintenanceForReview, getMaintenanceRequest, updateMaintenanceStatus } from '@/lib/api/admin-maintenance';
import { getApiErrorMessage } from '@/lib/api-client';
import { toneForStatus } from '@/lib/status-badge';
import { cn } from '@/lib/utils';
import type { AdminMaintenanceRequest, MaintenanceStatus } from '@/types/maintenance';

const STATUS_FILTERS: (MaintenanceStatus | 'ALL')[] = ['ALL', 'PENDING', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

export default function AdminMaintenancePage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [tickets, setTickets] = useState<AdminMaintenanceRequest[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<MaintenanceStatus | 'ALL'>('PENDING');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogTarget, setDialogTarget] = useState<AdminMaintenanceRequest | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const load = useCallback(
    (targetPage: number, reset: boolean) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      listMaintenanceForReview({
        page: targetPage,
        limit: 10,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      })
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          setTickets((prev) => (reset ? result.data : [...prev, ...result.data]));
          setPage(targetPage);
          setTotalPages(result.meta.totalPages);
        })
        .catch((err) => {
          if (requestId === requestIdRef.current) setError(getApiErrorMessage(err));
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setIsLoading(false);
        });
    },
    [search, statusFilter],
  );

  useEffect(() => {
    if (user) load(1, true);
  }, [user, load]);

  const handleUpdateStatus = async (
    status: MaintenanceStatus,
    adminNotes: string,
    takeRoomOutOfService: boolean,
  ) => {
    if (!dialogTarget) return;
    await updateMaintenanceStatus(dialogTarget.id, status, adminNotes || undefined, takeRoomOutOfService);
    load(1, true);
  };

  const handleViewPhoto = async (id: string) => {
    setPreviewLoading(id);
    try {
      const ticket = await getMaintenanceRequest(id);
      if (ticket.signedUrl) {
        window.open(ticket.signedUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPreviewLoading(null);
    }
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Maintenance</h1>

      <Input
        className="mt-3 max-w-sm"
        placeholder="Search by ticket #, issue, or room..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium',
              statusFilter === s
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            {s === 'ALL' ? 'All' : s.replace('_', ' ')}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {tickets.map((t) => (
          <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">{t.issueTitle}</p>
                <p className="mt-0.5 text-sm text-slate-500">
                  {t.user.firstName} {t.user.lastName} · {t.room ? `Room ${t.room.roomNumber}` : 'No room'}
                </p>
                <p className="mt-0.5 text-xs text-slate-400">{t.ticketNumber}</p>
                <p className="mt-1 text-sm text-slate-600">{t.description}</p>
                {t.adminNotes ? <p className="mt-1 text-sm text-slate-500">Note: {t.adminNotes}</p> : null}
              </div>
              <Badge variant={toneForStatus(t.status)}>{t.status.replace('_', ' ')}</Badge>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={previewLoading === t.id}
                onClick={() => handleViewPhoto(t.id)}
              >
                {previewLoading === t.id ? 'Loading...' : 'View photo'}
              </Button>
              {t.status === 'PENDING' || t.status === 'IN_PROGRESS' ? (
                <Button size="sm" onClick={() => setDialogTarget(t)}>
                  Update status
                </Button>
              ) : null}
            </div>
          </div>
        ))}

        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}

        {!isLoading && tickets.length === 0 ? (
          <p className="text-sm text-slate-500">No tickets match these filters.</p>
        ) : null}
      </div>

      {!isLoading && page < totalPages ? (
        <Button variant="outline" className="mt-4 w-full" onClick={() => load(page + 1, false)}>
          Load more
        </Button>
      ) : null}

      {dialogTarget ? (
        <MaintenanceStatusDialog
          open={dialogTarget !== null}
          onOpenChange={(open) => !open && setDialogTarget(null)}
          onConfirm={handleUpdateStatus}
          currentStatus={dialogTarget.status}
        />
      ) : null}
    </AdminShell>
  );
}