'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

/**
 * People who are already logged in (including everyone who opens the
 * installed app) should land on their own dashboard, not the public page.
 */
export function RedirectIfSignedIn() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading || !user) return;
    router.replace(user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard');
  }, [isLoading, user, router]);

  return null;
}