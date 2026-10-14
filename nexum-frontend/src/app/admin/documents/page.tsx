'use client';

import { useEffect, useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { RejectDialog } from '@/components/admin/reject-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listDocumentsForReview, getDocument, reviewDocument } from '@/lib/api/admin-documents';
import { getApiErrorMessage } from '@/lib/api-client';
import { toneForStatus } from '@/lib/status-badge';
import type { AdminDocument } from '@/types/document';

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminDocumentsPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [documents, setDocuments] = useState<AdminDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState<string | null>(null);

  const load = () => {
    listDocumentsForReview('PENDING')
      .then(setDocuments)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));

    queueMicrotask(() => {
      setIsLoading(true);
      setError(null);
    });
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    try {
      await reviewDocument(id, 'APPROVED');
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
      await reviewDocument(id, 'REJECTED', reason);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setActioningId(null);
    }
  };

  const handleView = async (id: string) => {
    setPreviewLoading(id);
    try {
      const doc = await getDocument(id);
      window.open(doc.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setPreviewLoading(null);
    }
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Documents for review</h1>
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-28 w-full rounded-xl" />
            <Skeleton className="h-28 w-full rounded-xl" />
          </>
        ) : documents.length === 0 ? (
          <p className="text-sm text-slate-500">Nothing pending review.</p>
        ) : (
          documents.map((doc) => (
            <div key={doc.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{doc.title}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {doc.user.firstName} {doc.user.lastName} · {doc.user.email}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {doc.documentType.replace(/_/g, ' ')} · v{doc.version} · {formatBytes(doc.fileSizeBytes)}
                  </p>
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
                <Button
                  size="sm"
                  disabled={actioningId === doc.id}
                  onClick={() => handleApprove(doc.id)}
                >
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
              </div>
            </div>
          ))
        )}
      </div>

      <RejectDialog
        open={rejectTarget !== null}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        onConfirm={(reason) => handleReject(rejectTarget!, reason)}
        title="Reject document"
      />
    </AdminShell>
  );
}