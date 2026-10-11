'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listMyNotifications, markNotificationRead, markAllNotificationsRead } from '@/lib/api/notifications';
import { getApiErrorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types/notification';

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const load = () => {
    setIsLoading(true);
    listMyNotifications()
      .then(setNotifications)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleOpen = async (notification: AppNotification) => {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      markNotificationRead(notification.id).catch(() => {});
    }
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    try {
      await markAllNotificationsRead();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const hasUnread = notifications.some((n) => !n.isRead);

  return (
    <AppShell>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-slate-900">Notifications</h1>
          {hasUnread ? (
            <Button variant="ghost" size="sm" onClick={handleMarkAllRead}>
              Mark all read
            </Button>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        <div className="mt-3 space-y-2">
          {isLoading ? (
            <>
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </>
          ) : notifications.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-500">No notifications yet.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleOpen(n)}
                className={cn(
                  'w-full rounded-xl border p-4 text-left shadow-sm transition-colors',
                  n.isRead ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className={cn('text-sm', n.isRead ? 'font-normal text-slate-700' : 'font-semibold text-slate-900')}>
                    {n.title}
                  </p>
                  {!n.isRead ? <span className="mt-1 size-2 flex-shrink-0 rounded-full bg-blue-600" /> : null}
                </div>
                <p className="mt-1 text-sm text-slate-500">{n.content}</p>
                <p className="mt-1.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
              </button>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
}