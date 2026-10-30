'use client';

import Image from 'next/image';
import Link from 'next/link';
import { buttonVariants } from '@/components/ui/button';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';

/** Top bar for the pages anyone can open, with Sign in and Sign up. */
export function PublicHeader() {
  const { user, isLoading } = useAuth();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-3 px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={28} height={28} priority />
          <span className="text-base font-bold tracking-tight text-slate-900">Nexum</span>
        </Link>

        <nav className="flex items-center gap-2">
          <Link href="/explore" className="hidden px-2 text-sm text-slate-600 hover:text-slate-900 sm:inline">
            Rooms
          </Link>

          {isLoading ? null : user ? (
            <Link
              href={user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'}
              className={buttonVariants({ size: 'sm' })}
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                Sign in
              </Link>
              <Link href="/register" className={buttonVariants({ size: 'sm' })}>
                Sign up
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}