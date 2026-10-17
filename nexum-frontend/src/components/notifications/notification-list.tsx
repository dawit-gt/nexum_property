'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/lib/api/notifications';
import { getApiErrorMessage } from '@/lib/api-client';
import { cn } from '@/lib/utils';
import type { AppNotification, NotificationType } from '@/types/notification';

const TENANT_ROUTE_BY_TYPE: Record<NotificationType, string> = {
  REGISTRATION: '/profile',
  DOCUMENT: '/profile',
  ROOM_REQUEST: '/requests',
  LEASE: '/leases',
  PAYMENT: '/payments',
  PAYMENT_DUE_ALERT: '/payments',
  MAINTENANCE: '/requests',
  ANNOUNCEMENT: '/messages',
  SYSTEM: '/messages',
};

const ADMIN_ROUTE_BY_TYPE: Record<NotificationType, string> = {
  REGISTRATION: '/admin/users?registrationStatus=PENDING',
  DOCUMENT: '/admin/documents',
  ROOM_REQUEST: '/admin/room-requests',
  LEASE: '/admin/leases',
  PAYMENT: '/admin/payments',
  PAYMENT_DUE_ALERT: '/admin/leases',
  MAINTENANCE: '/admin/maintenance',
  ANNOUNCEMENT: '/admin/messages',
  SYSTEM: '/admin/messages',
};

function routeFor(n: AppNotification, isAdmin: boolean): string {
  if (n.actionUrl?.startsWith('/')) return n.actionUrl;
  return (isAdmin ? ADMIN_ROUTE_BY_TYPE : TENANT_ROUTE_BY_TYPE)[n.type];
}

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

/** The notification inbox, shared by the tenant and admin pages. */
export function NotificationList({ isAdmin = false }: { isAdmin?: boolean }) {
  const router = useRouter();

  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    listMyNotifications()
      .then((data) => {
        if (!cancelled) setNotifications(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleOpen = (notification: AppNotification) => {
    if (!notification.isRead) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notification.id ? { ...n, isRead: true } : n)),
      );
      markNotificationRead(notification.id).catch(() => {});
    }
    router.push(routeFor(notification, isAdmin));
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
    <div>
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
              type="button"
              onClick={() => handleOpen(n)}
              className={cn(
                'w-full rounded-xl border p-4 text-left shadow-sm transition-colors',
                n.isRead ? 'border-slate-200 bg-white' : 'border-slate-300 bg-slate-50',
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <p
                  className={cn(
                    'text-sm',
                    n.isRead ? 'font-normal text-slate-700' : 'font-semibold text-slate-900',
                  )}
                >
                  {n.title}
                </p>
                {!n.isRead ? (
                  <span className="mt-1 size-2 flex-shrink-0 rounded-full bg-blue-600" />
                ) : null}
              </div>
              <p className="mt-1 text-sm text-slate-500">{n.content}</p>
              <p className="mt-1.5 text-xs text-slate-400">{timeAgo(n.createdAt)}</p>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
