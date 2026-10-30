'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { PublicFooter } from '@/components/public/public-footer';
import { PublicHeader } from '@/components/public/public-header';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/lib/auth-context';
import { getApiErrorMessage } from '@/lib/api-client';
import { getPublicRoom } from '@/lib/api/public-rooms';
import { nextQuery } from '@/lib/safe-redirect';
import type { PublicRoom } from '@/types/public-room';

export default function PublicRoomPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();

  const [room, setRoom] = useState<PublicRoom | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getPublicRoom(id)
      .then((data) => {
        if (!cancelled) setRoom(data);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [id]);

  // After signing up or in, bring the visitor straight back to requesting this room.
  const next = nextQuery(`/rooms/${id}`);

  return (
    <div className="min-h-dvh bg-neutral-50">
      <PublicHeader />

      <main className="mx-auto max-w-5xl px-4 py-6">
        <Link href="/explore" className="text-sm text-slate-500 hover:text-slate-900">
          &larr; All rooms
        </Link>

        {error ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm text-slate-600">
              {error === 'Room not found'
                ? 'This room is no longer available. It may have just been taken.'
                : error}
            </p>
            <Link href="/explore" className={`${buttonVariants()} mt-4`}>
              See other rooms
            </Link>
          </div>
        ) : !room ? (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-4 w-full" />
          </div>
        ) : (
          <div className="mt-4 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div>
              {room.images.length > 0 ? (
                <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto rounded-2xl">
                  {room.images.map((url) => (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={url}
                      src={url}
                      alt={`Room ${room.roomNumber}`}
                      className="h-64 w-full flex-shrink-0 snap-center rounded-2xl object-cover sm:h-80"
                    />
                  ))}
                </div>
              ) : (
                <div className="flex h-64 items-center justify-center rounded-2xl bg-slate-100 text-sm text-slate-400 sm:h-80">
                  No photos yet
                </div>
              )}

              <h1 className="mt-5 text-2xl font-semibold text-slate-900">Room {room.roomNumber}</h1>
              <p className="mt-1 text-sm text-slate-500">
                {room.property.name} · {room.building.name} · Floor {room.floor.floorNumber}
              </p>
              <p className="mt-0.5 text-sm text-slate-500">
                {room.property.address}, {room.property.city}
              </p>

              <dl className="mt-5 grid grid-cols-3 gap-3 text-center">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <dt className="text-xs text-slate-500">Size</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{Number(room.areaSqM).toLocaleString()} m²</dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <dt className="text-xs text-slate-500">Price per m²</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">
                    {Number(room.pricePerSqM).toLocaleString()} ETB
                  </dd>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <dt className="text-xs text-slate-500">Floor</dt>
                  <dd className="mt-0.5 font-semibold text-slate-900">{room.floor.floorNumber}</dd>
                </div>
              </dl>

              {room.description ? (
                <div className="mt-5">
                  <h2 className="font-medium text-slate-900">About this room</h2>
                  <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{room.description}</p>
                </div>
              ) : null}
            </div>

            {/* Request box */}
            <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-20">
              <p className="text-2xl font-bold text-slate-900">
                {Number(room.monthlyRent).toLocaleString()} ETB
                <span className="text-sm font-normal text-slate-500"> / month</span>
              </p>

              {authLoading ? (
                <Skeleton className="mt-4 h-10 w-full rounded-lg" />
              ) : user?.role === 'ADMIN' ? (
                <p className="mt-4 text-sm text-slate-500">
                  You are signed in as an admin.{' '}
                  <Link href="/admin/rooms" className="underline">
                    Manage rooms
                  </Link>
                </p>
              ) : user ? (
                <>
                  <p className="mt-3 text-sm text-slate-500">Choose your move-in date and send your request.</p>
                  <Link href={`/rooms/${room.id}`} className={`${buttonVariants({ size: 'lg' })} mt-4 w-full`}>
                    Request this room
                  </Link>
                </>
              ) : (
                <>
                  <p className="mt-3 text-sm text-slate-500">
                    Want this room? Create a free account to request it. You will upload your documents, and an admin
                    reviews them before approving you.
                  </p>
                  <Link href={`/register${next}`} className={`${buttonVariants({ size: 'lg' })} mt-4 w-full`}>
                    Create an account to request
                  </Link>
                  <p className="mt-3 text-center text-sm text-slate-500">
                    Already have an account?{' '}
                    <Link href={`/login${next}`} className="font-medium text-slate-900 underline">
                      Sign in
                    </Link>
                  </p>
                </>
              )}
            </aside>
          </div>
        )}
      </main>

      <PublicFooter />
    </div>
  );
}
