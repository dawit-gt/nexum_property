'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { Home, Building2, ClipboardList, Receipt, Bell, LogOut, User, MessageSquare } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useUnreadCount } from '@/lib/use-unread-count';
import { useUnreadMessageCount } from '@/lib/use-unread-message-count';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/rooms', label: 'Rooms', icon: Building2 },
  { href: '/requests', label: 'Requests', icon: ClipboardList },
  { href: '/payments', label: 'Payments', icon: Receipt },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const unreadCount = useUnreadCount();
  const unreadMessages = useUnreadMessageCount();

  return (
    <div className="min-h-dvh bg-neutral-50">
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/logo.png" alt="" width={28} height={28} />
          <span className="text-base font-bold tracking-tight text-slate-900">Nexum</span>
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/messages" className="relative" aria-label="Messages">
            <MessageSquare className="size-5 text-slate-600" />
            {unreadMessages > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
                {unreadMessages > 9 ? '9+' : unreadMessages}
              </span>
            ) : null}
          </Link>
          <Link href="/notifications" className="relative" aria-label="Notifications">
            <Bell className="size-5 text-slate-600" />
            {unreadCount > 0 ? (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-medium text-white">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            ) : null}
          </Link>
          <Link href="/profile" aria-label="Profile">
            <User className="size-5 text-slate-600" />
          </Link>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-500" aria-label="Log out">
            <span className="hidden sm:inline">{user?.firstName}</span>
            <LogOut className="size-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md pb-20 sm:max-w-2xl">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-slate-200 bg-white sm:hidden">
        <div className="mx-auto flex max-w-md">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex flex-1 flex-col items-center gap-1 py-2.5 text-xs',
                  active ? 'text-slate-900' : 'text-slate-400',
                )}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}