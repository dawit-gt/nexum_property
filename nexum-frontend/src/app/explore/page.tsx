'use client';

import { useState } from 'react';
import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { RoomCard } from '@/components/public/room-card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { listPublicRooms, type PublicRoomListParams, type PublicRoomSort } from '@/lib/api/public-rooms';
import { useDebouncedValue, usePaginatedList } from '@/lib/use-paginated-list';
import type { PublicRoom } from '@/types/public-room';

const SORT_OPTIONS: { value: PublicRoomSort; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
];

export default function ExplorePage() {
  const [search, setSearch] = useState('');
  const [maxRent, setMaxRent] = useState('');
  const [sort, setSort] = useState<PublicRoomSort>('newest');

  const debouncedSearch = useDebouncedValue(search);
  const debouncedMaxRent = useDebouncedValue(maxRent);

  const list = usePaginatedList<PublicRoom, PublicRoomListParams>(
    listPublicRooms,
    {
      search: debouncedSearch.trim() || undefined,
      maxRent: debouncedMaxRent && Number(debouncedMaxRent) > 0 ? Number(debouncedMaxRent) : undefined,
      sort,
    },
    { enabled: true, limit: 12 },
  );

  return (
    <div className="min-h-dvh bg-neutral-50">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <h1 className="text-2xl font-semibold text-slate-900">Available rooms</h1>
        <p className="mt-1 text-sm text-slate-500">
          Browse as a guest. Create a free account when you find a room you want to request.
        </p>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_180px_200px]">
          <Input
            type="search"
            placeholder="Search by room, building or place..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Input
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="Max rent (ETB)"
            value={maxRent}
            onChange={(e) => setMaxRent(e.target.value)}
          />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as PublicRoomSort)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700"
            aria-label="Sort rooms"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {list.error ? <p className="mt-4 text-sm text-red-600">{list.error}</p> : null}

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.isLoading
            ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-2xl" />)
            : list.items.map((room) => <RoomCard key={room.id} room={room} />)}
        </div>

        {!list.isLoading && list.items.length === 0 ? (
          <p className="mt-10 text-center text-sm text-slate-500">No available rooms match your search.</p>
        ) : null}

        {!list.isLoading && list.total > 0 ? (
          <div className="mt-8 space-y-2 text-center">
            <p className="text-xs text-slate-400">
              Showing {list.items.length} of {list.total}
            </p>
            {list.hasMore ? (
              <Button type="button" variant="outline" disabled={list.isLoadingMore} onClick={list.loadMore}>
                {list.isLoadingMore ? 'Loading...' : 'Load more'}
              </Button>
            ) : null}
          </div>
        ) : null}
      </main>

      <PublicFooter />
    </div>
  );
}
