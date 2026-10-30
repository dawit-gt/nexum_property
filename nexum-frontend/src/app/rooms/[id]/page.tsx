'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { getRoom, createRoomRequest } from '@/lib/api/rooms';
import { getApiErrorMessage } from '@/lib/api-client';
import type { Room } from '@/types/room';

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [desiredStartDate, setDesiredStartDate] = useState('');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  useEffect(() => {
    getRoom(id)
      .then(setRoom)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await createRoomRequest({
        roomId: id,
        desiredStartDate,
        note: note || undefined,
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(getApiErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="space-y-3 p-4">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-full" />
        </div>
      </AppShell>
    );
  }

  if (error || !room) {
    return (
      <AppShell>
        <div className="p-4">
          <p className="text-sm text-red-600">
            {error ?? 'Room not found.'}
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="p-4">
        {room.images.length > 0 ? (
          <div className="flex snap-x gap-2 overflow-x-auto rounded-xl">
            {room.images.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt={`Room ${room.roomNumber}`}
                className="h-48 w-full flex-shrink-0 snap-center rounded-xl object-cover"
              />
            ))}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">
            No photos yet
          </div>
        )}

        <h1 className="mt-4 text-lg font-semibold text-slate-900">
          Room {room.roomNumber}
        </h1>

        <p className="mt-1 text-xl font-bold text-slate-900">
          {Number(room.monthlyRent).toLocaleString()} ETB
          <span className="text-sm font-normal text-slate-500">
            /month
          </span>
        </p>

        <p className="mt-1 text-sm text-slate-500">
          {room.areaSqM} m²
        </p>

        {room.description ? (
          <p className="mt-3 text-sm text-slate-700">
            {room.description}
          </p>
        ) : null}

        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          {user?.registrationStatus === 'REJECTED' ? (
            <p className="text-sm text-slate-500">
              Your registration was not approved, so you can&apos;t request a room yet. Open your Profile to see why
              and upload corrected documents.
            </p>
          ) : user?.registrationStatus !== 'APPROVED' ? (
            <p className="text-sm text-slate-500">
              Thanks for your interest in this room! An admin needs to approve your registration before you can send
              a request. You&apos;ll get a notification as soon as it&apos;s approved, and you can come back to this
              page to request it.
            </p>
          ) : submitted ? (
            <p className="text-sm text-green-700">
              Your request has been submitted. An admin will review it soon — check your notifications for updates.
            </p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <h2 className="font-medium text-slate-900">
                Request this room
              </h2>

              <div className="space-y-1.5">
                <Label htmlFor="desiredStartDate">
                  Desired move-in date
                </Label>
                <Input
                  id="desiredStartDate"
                  type="date"
                  required
                  value={desiredStartDate}
                  onChange={(e) =>
                    setDesiredStartDate(e.target.value)
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="note">
                  Note (optional)
                </Label>
                <Textarea
                  id="note"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              {submitError ? (
                <p className="text-sm text-red-600">
                  {submitError}
                </p>
              ) : null}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Submitting...'
                  : 'Submit request'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </AppShell>
  );
}