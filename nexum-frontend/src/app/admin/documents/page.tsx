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
  listDocumentsForReview,
  getDocument,
  reviewDocument,
  type DocumentListParams,
} from '@/lib/api/admin-documents';
import { getApiErrorMessage } from '@/lib/api-client';
import { formatDate } from '@/lib/lease-utils';
import { toneForStatus } from '@/lib/status-badge';
import { useDebouncedValue, usePaginatedList } from '@/lib/use-paginated-list';
import type { AdminDocument, DocumentStatus } from '@/types/document';

type StatusFilter = DocumentStatus | 'ALL';

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
  { value: 'ALL', label: 'All' },
];

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDocumentsPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<StatusFilter>('PENDING');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const list = usePaginatedList<AdminDocument, DocumentListParams>(
    listDocumentsForReview,
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
      await reviewDocument(id, 'APPROVED');
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
      await reviewDocument(id, 'REJECTED', reason);
      await list.reload();
    } catch (err) {
      setActionError(getApiErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  };

  const handleView = async (id: string) => {
    setActionError(null);
    setPreviewLoading(id);
    try {
      const doc = await getDocument(id);
      window.open(doc.signedUrl, '_blank', 'noopener,noreferrer');
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
      <h1 className="text-lg font-semibold text-slate-900">Documents</h1>

      <ListToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by title, tenant name or email..."
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
              : 'No documents match these filters.'}
          </p>
        ) : (
          list.items.map((doc) => (
            <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{doc.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {doc.user.firstName} {doc.user.lastName} · {doc.user.email}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {doc.documentType.replace(/_/g, ' ')} · v{doc.version} · {formatBytes(doc.fileSizeBytes)} ·
                    uploaded {formatDate(doc.createdAt)}
                  </p>
                  {doc.status !== 'PENDING' && doc.reviewedAt ? (
                    <p className="mt-0.5 text-xs text-slate-400">Reviewed {formatDate(doc.reviewedAt)}</p>
                  ) : null}
                  {doc.status === 'REJECTED' && doc.rejectionReason ? (
                    <p className="mt-1 text-sm text-red-700">Reason: {doc.rejectionReason}</p>
                  ) : null}
                </div>
                <Badge variant={toneForStatus(doc.status)}>{doc.status}</Badge>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={previewLoading === doc.id}
                  onClick={() => handleView(doc.id)}
                >
                  {previewLoading === doc.id ? 'Loading...' : 'View file'}
                </Button>
                {doc.status === 'PENDING' ? (
                  <>
                    <Button size="sm" disabled={actioningId === doc.id} onClick={() => handleApprove(doc.id)}>
                      Approve
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={actioningId === doc.id}
                      onClick={() => setRejectTarget(doc.id)}
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
        title="Reject document"
      />
    </AdminShell>
  );
}