'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { NotificationList } from '@/components/notifications/notification-list';

export default function NotificationsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) router.push('/login');
  }, [isLoading, user, router]);

  if (!user) return null;

  return (
    <AppShell>
      <div className="p-4">
        <NotificationList />
      </div>
    </AppShell>
  );
}
