'use client';

import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { NotificationList } from '@/components/notifications/notification-list';

export default function AdminNotificationsPage() {
  const { isLoading } = useAdminGuard();

  if (isLoading) return null;

  return (
    <AdminShell>
      <NotificationList isAdmin />
    </AdminShell>
  );
}
