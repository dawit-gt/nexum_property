'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getApiErrorMessage } from '@/lib/api-client';
import { listInbox, markMessageRead } from '@/lib/api/messages';
import { cn } from '@/lib/utils';
import type { InboxItem } from '@/types/message';

const LIMIT = 20;

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function InboxList() {
  const [items, setItems] = useState<InboxItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(async (p: number) => {
    try {
      const res = await listInbox(p, LIMIT);
      setItems((prev) => (p === 1 ? res.data : [...prev, ...res.data]));
      setPage(p);
      setTotalPages(res.meta.totalPages);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const handleToggle = (item: InboxItem) => {
    setOpenId((prev) => (prev === item.id ? null : item.id));

    if (!item.isRead) {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isRead: true } : i)),
      );
      markMessageRead(item.messageId).catch(() => {});
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-500">No messages yet.</p>
      ) : (
        items.map((item) => {
          const { message } = item;
          const open = openId === item.id;
          const senderName = `${message.sender.firstName} ${message.sender.lastName}`;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleToggle(item)}
              className={cn(
                'w-full rounded-xl border p-4 text-left shadow-sm transition-colors',
                item.isRead ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    'text-sm',
                    item.isRead ? 'font-normal text-slate-700' : 'font-semibold text-slate-900',
                  )}
                >
                  {message.subject}
                </p>
                {!item.isRead ? (
                  <span className="mt-1 size-2 flex-shrink-0 rounded-full bg-blue-600" />
                ) : null}
              </div>

              <p className="mt-0.5 text-xs text-slate-500">
                {senderName}
                {message.sender.role === 'ADMIN' ? ' (Admin)' : ''} · {formatDateTime(item.createdAt)}
              </p>

              <p className={cn('mt-2 whitespace-pre-wrap text-sm text-slate-600', open ? '' : 'line-clamp-2')}>
                {message.body}
              </p>
            </button>
          );
        })
      )}

      {page < totalPages ? (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={loadingMore}
          onClick={() => {
            setLoadingMore(true);
            load(page + 1);
          }}
        >
          {loadingMore ? 'Loading...' : 'Load more'}
        </Button>
      ) : null}
    </div>
  );
}