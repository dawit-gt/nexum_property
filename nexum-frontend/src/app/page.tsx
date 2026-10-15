'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';

export default function Home() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    if (!user) {
      router.replace('/login');
    } else {
      router.replace(
        user.role === 'ADMIN'
          ? '/admin/dashboard'
          : '/dashboard',
      );
    }
  }, [isLoading, user, router]);

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <p className="text-sm text-slate-500">Loading...</p>
    </div>
  );
}