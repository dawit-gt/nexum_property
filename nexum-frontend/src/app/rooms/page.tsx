'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listRooms } from '@/lib/api/rooms';
import { getApiErrorMessage } from '@/lib/api-client';
import type { Room } from '@/types/room';

export default function RoomsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setError(null);

    listRooms({ page, limit: 10, search: search || undefined })
      .then((result) => {
        if (cancelled) return;
        setRooms((prev) => (page === 1 ? result.data : [...prev, ...result.data]));
        setTotalPages(result.meta.totalPages);
      })
      .catch((err) => !cancelled && setError(getApiErrorMessage(err)))
      .finally(() => !cancelled && setIsLoading(false));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-lg font-semibold text-slate-900">Available rooms</h1>

        <Input
          className="mt-3"
          placeholder="Search by room number..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
        />

        {error ? <p className="mt-4 text-sm text-red-600">{error}</p> : null}

        <div className="mt-4 space-y-3">
          {rooms.map((room) => (
            <Link
              key={room.id}
              href={`/rooms/${room.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">Room {room.roomNumber}</p>
                  {room.description ? (
                    <p className="mt-0.5 line-clamp-2 text-sm text-slate-500">{room.description}</p>
                  ) : null}
                </div>
                <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
                  {Number(room.monthlyRent).toLocaleString()} ETB<span className="font-normal text-slate-500">/mo</span>
                </p>
              </div>
            </Link>
          ))}

          {isLoading &&
            Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}

          {!isLoading && rooms.length === 0 ? (
            <p className="mt-8 text-center text-sm text-slate-500">No available rooms match your search.</p>
          ) : null}
        </div>

        {!isLoading && page < totalPages ? (
          <Button variant="outline" className="mt-4 w-full" onClick={() => setPage((p) => p + 1)}>
            Load more
          </Button>
        ) : null}
      </div>
    </AppShell>
  );
}