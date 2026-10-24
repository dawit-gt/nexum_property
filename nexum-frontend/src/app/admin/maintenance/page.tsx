'use client';

import { useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { MaintenanceStatusDialog } from '@/components/admin/maintenance-status-dialog';
import { ListFooter, ListToolbar } from '@/components/admin/list-toolbar';
import { ExportButton } from '@/components/admin/export-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  listMaintenanceForReview,
  getMaintenanceRequest,
  updateMaintenanceStatus,
  type ListMaintenanceParams,
} from '@/lib/api/admin-maintenance';
import { getApiErrorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/lease-utils';
import { toneForStatus } from '@/lib/status-badge';
import { useDebouncedValue, usePaginatedList } from '@/lib/use-paginated-list';
import type { AdminMaintenanceRequest, MaintenanceStatus } from '@/types/maintenance';

type StatusFilter = MaintenanceStatus | 'ALL';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'RESOLVED', label: 'Resolved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

export default function AdminMaintenancePage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const list = usePaginatedList<AdminMaintenanceRequest, ListMaintenanceParams>(
    listMaintenanceForReview,
    {
      status,
      search: debouncedSearch.trim() || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    { enabled: Boolean(user) },
  );

  const [actionError, setActionError] = useState<string | null>(null);
  const [dialogTarget, setDialogTarget] = useState<AdminMaintenanceRequest | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const handleUpdateStatus = async (
    nextStatus: MaintenanceStatus,
    adminNotes: string,
    takeRoomOutOfService: boolean,
  ) => {
    if (!dialogTarget) return;
    await updateMaintenanceStatus(dialogTarget.id, nextStatus, adminNotes || undefined, takeRoomOutOfService);
    await list.reload();
  };

  const handleViewPhoto = async (id: string) => {
    setActionError(null);
    setPreviewLoading(id);
    try {
      const ticket = await getMaintenanceRequest(id);
      if (ticket.signedUrl) {
        window.open(ticket.signedUrl, '_blank', 'noopener,noreferrer');
      }
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
      <h1 className="text-lg font-semibold text-slate-900">Maintenance</h1>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by ticket #, issue, or room..."
        statusOptions={STATUS_OPTIONS}
        status={status}
        onStatusChange={(v) => setStatus(v as StatusFilter)}
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFromChange={setDateFrom}
        onDateToChange={setDateTo}
      />

      <div className="mt-3 flex justify-end">
        <ExportButton
          path="/dashboard/maintenance/export"
          filenameBase="maintenance"
          params={{
            status,
            search: debouncedSearch.trim() || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          }}
        />
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {list.isLoading ? (
          <>
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </>
        ) : list.items.length === 0 ? (
          <p className="text-sm text-slate-500">No tickets match these filters.</p>
        ) : (
          list.items.map((t) => (
            <div key={t.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{t.issueTitle}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {t.user.firstName} {t.user.lastName} · {t.room ? `Room ${t.room.roomNumber}` : 'No room'}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {t.ticketNumber} · reported {formatDate(t.createdAt)}
                  </p>
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
