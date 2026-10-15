'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, FileText, Receipt, ClipboardList, Building2,
  Users, Wrench, MessageSquare, History, LogOut, Menu, FileSignature,
} from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/documents', label: 'Documents', icon: FileText },
  { href: '/admin/payments', label: 'Payments', icon: Receipt },
  { href: '/admin/room-requests', label: 'Room Requests', icon: ClipboardList },
  { href: '/admin/leases', label: 'Leases', icon: FileSignature },
  { href: '/admin/properties', label: 'Properties & Rooms', icon: Building2 },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/maintenance', label: 'Maintenance', icon: Wrench },
  { href: '/admin/messages', label: 'Messages', icon: MessageSquare },
  { href: '/admin/audit-logs', label: 'Audit Logs', icon: History },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium',
              active ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100',
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <div className="min-h-dvh bg-neutral-50 md:flex">
      {/* Desktop sidebar */}
      <aside className="hidden w-64 flex-shrink-0 border-r border-slate-200 bg-white p-4 md:block">
        <div className="flex items-center gap-2 px-3">
          <Image src="/logo.png" alt="" width={28} height={28} />
          <p className="text-lg font-bold tracking-tight text-slate-900">Nexum Admin</p>
        </div>
        <div className="mt-6">
          <NavLinks />
        </div>
      </aside>

      <div className="flex min-h-dvh flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4">
          <div className="flex items-center gap-2 md:hidden">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger aria-label="Open menu">
                <Menu className="size-5 text-slate-700" />
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-4">
                <SheetTitle className="flex items-center gap-2 px-3 text-lg font-bold tracking-tight text-slate-900">
                  <Image src="/logo.png" alt="" width={24} height={24} />
                  Nexum Admin
                </SheetTitle>
                <div className="mt-6">
                  <NavLinks onNavigate={() => setSheetOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
            <span className="flex items-center gap-2 text-base font-bold tracking-tight text-slate-900">
              <Image src="/logo.png" alt="" width={24} height={24} />
              Nexum Admin
            </span>
          </div>
          <span className="hidden text-sm text-slate-500 md:inline">Signed in as {user?.firstName}</span>
          <button onClick={logout} className="flex items-center gap-1.5 text-sm text-slate-500" aria-label="Log out">
            <span className="hidden sm:inline">Log out</span>
            <LogOut className="size-4" />
          </button>
        </header>

        <main className="flex-1 p-4">{children}</main>
      </div>
    </div>
  );
}