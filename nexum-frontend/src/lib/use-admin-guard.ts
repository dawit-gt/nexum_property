'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-context';

/** Redirects unauthenticated users to /login and non-admins to /dashboard. */
export function useAdminGuard() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.push('/login');
    } else if (user.role !== 'ADMIN') {
      router.push('/dashboard');
    }
  }, [isLoading, user, router]);

  return { user, isLoading: isLoading || !user || user.role !== 'ADMIN' };
}