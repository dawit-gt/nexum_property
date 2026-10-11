'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { listUsers } from '@/lib/api/admin-users';
import { getApiErrorMessage } from '@/lib/api-client';
import { toneForStatus } from '@/lib/status-badge';
import { cn } from '@/lib/utils';
import type { RegistrationStatus, SafeUser } from '@/types/api';

const REG_FILTERS: (RegistrationStatus | 'ALL')[] = ['ALL', 'PENDING', 'APPROVED', 'REJECTED'];

function parseFilter(value: string | null): RegistrationStatus | 'ALL' {
  return REG_FILTERS.find((f) => f === value) ?? 'ALL';
}

function AdminUsersContent() {
  const { user, isLoading: guardLoading } = useAdminGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const filter = parseFilter(searchParams.get('registrationStatus'));

  const [users, setUsers] = useState<SafeUser[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only the latest request is allowed to update the list (guards against
  // out-of-order responses while typing in the search box).
  const requestIdRef = useRef(0);

  const load = useCallback(
    (targetPage: number, reset: boolean) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      listUsers({
        page: targetPage,
        limit: 10,
        search: search || undefined,
        registrationStatus: filter === 'ALL' ? undefined : filter,
      })
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          setUsers((prev) => (reset ? result.data : [...prev, ...result.data]));
          setPage(targetPage);
          setTotalPages(result.meta.totalPages);
        })
        .catch((err) => {
          if (requestId === requestIdRef.current) setError(getApiErrorMessage(err));
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setIsLoading(false);
        });
    },
    [search, filter],
  );

  useEffect(() => {
    if (user) load(1, true);
  }, [user, load]);

  const setFilter = (next: RegistrationStatus | 'ALL') => {
    router.replace(next === 'ALL' ? '/admin/users' : `/admin/users?registrationStatus=${next}`);
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Users</h1>

      <Input
        className="mt-3 max-w-sm"
        placeholder="Search by name, email, phone, or room..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {REG_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium',
              filter === f ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {users.map((u) => (
          <Link
            key={u.id}
            href={`/admin/users/${u.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="font-medium text-slate-900">
                  {u.firstName} {u.lastName}
                </p>
                <p className="mt-0.5 truncate text-sm text-slate-500">{u.email}</p>
                <p className="text-xs text-slate-400">{u.phone}</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={toneForStatus(u.registrationStatus)}>{u.registrationStatus}</Badge>
                {u.role === 'ADMIN' ? <Badge variant="outline">ADMIN</Badge> : null}
                {u.status !== 'ACTIVE' ? <Badge variant="destructive">{u.status}</Badge> : null}
              </div>
            </div>
          </Link>
        ))}

        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}

        {!isLoading && users.length === 0 ? (
          <p className="text-sm text-slate-500">No users match these filters.</p>
        ) : null}
      </div>

      {!isLoading && page < totalPages ? (
        <Button variant="outline" className="mt-4 w-full" onClick={() => load(page + 1, false)}>
          Load more
        </Button>
      ) : null}
    </AdminShell>
  );
}

export default function AdminUsersPage() {
  return (
    <Suspense fallback={null}>
      <AdminUsersContent />
    </Suspense>
  );
}