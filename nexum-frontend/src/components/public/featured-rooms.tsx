'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoomCard } from '@/components/public/room-card';
import { Skeleton } from '@/components/ui/skeleton';
import { buttonVariants } from '@/components/ui/button';
import { listPublicRooms } from '@/lib/api/public-rooms';
import type { PublicRoom } from '@/types/public-room';

/** The newest few available rooms, for the landing page. */
export function FeaturedRooms({ limit = 6 }: { limit?: number }) {
  const [rooms, setRooms] = useState<PublicRoom[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listPublicRooms({ limit })
      .then((result) => {
        if (!cancelled) setRooms(result.data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });

    return () => {
      cancelled = true;
    };
  }, [limit]);

  if (failed) {
    return (
      <p className="text-center text-sm text-slate-500">
        We couldn&apos;t load the rooms just now.{' '}
        <Link href="/explore" className="underline">
          Try the full list
        </Link>
        .
      </p>
    );
  }

  if (!rooms) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  if (rooms.length === 0) {
    return <p className="text-center text-sm text-slate-500">No rooms are open right now. Please check back soon.</p>;
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </div>
      <div className="mt-6 text-center">
        <Link href="/explore" className={buttonVariants({ variant: 'outline' })}>
          See all available rooms
        </Link>
      </div>
    </>
  );
}
