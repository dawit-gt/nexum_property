'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { FormDialog, type FormField } from '@/components/admin/form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { listRoomsAdmin, createRoom } from '@/lib/api/admin-rooms';
import { getApiErrorMessage } from '@/lib/api-client';
import { omitEmpty } from '@/lib/form-utils';
import { toneForStatus } from '@/lib/status-badge';
import { cn } from '@/lib/utils';
import type { Room, RoomStatus } from '@/types/room';

const STATUS_FILTERS: (RoomStatus | 'ALL')[] = ['ALL', 'AVAILABLE', 'RESERVED', 'OCCUPIED', 'MAINTENANCE', 'INACTIVE'];

const ROOM_FIELDS: FormField[] = [
  { name: 'roomNumber', label: 'Room number', required: true, placeholder: '101' },
  { name: 'areaSqM', label: 'Area (m²)', type: 'number', step: '0.01', required: true, placeholder: '25.5' },
  { name: 'pricePerSqM', label: 'Price per m² (ETB)', type: 'number', step: '0.01', required: true, placeholder: '800' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

function AdminRoomsContent() {
  const { user, isLoading: guardLoading } = useAdminGuard();
  const router = useRouter();
  const searchParams = useSearchParams();
  const floorId = searchParams.get('floorId') ?? undefined;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<RoomStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Guards against out-of-order responses: if the admin types quickly, only
  // the response for the LATEST request is allowed to update the list.
  const requestIdRef = useRef(0);

  const load = useCallback(
    (targetPage: number, reset: boolean) => {
      const requestId = ++requestIdRef.current;

      listRoomsAdmin({
        page: targetPage,
        limit: 10,
        search: search || undefined,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
        floorId,
      })
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          setRooms((prev) => (reset ? result.data : [...prev, ...result.data]));
          setPage(targetPage);
          setTotalPages(result.meta.totalPages);
        })
        .catch((err) => {
          if (requestId === requestIdRef.current) setError(getApiErrorMessage(err));
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setIsLoading(false);
        });

      queueMicrotask(() => {
        if (requestId === requestIdRef.current) {
          setIsLoading(true);
          setError(null);
        }
      });
    },
    [search, statusFilter, floorId],
  );

  useEffect(() => {
    if (user) load(1, true);
  }, [user, load]);

  const handleCreate = async (values: Record<string, string>) => {
    await createRoom({
      floorId: floorId!,
      roomNumber: values.roomNumber,
      areaSqM: Number(values.areaSqM),
      pricePerSqM: Number(values.pricePerSqM),
      ...omitEmpty({ description: values.description ?? '' }),
    });
    load(1, true);
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      {floorId ? (
        <button onClick={() => router.back()} className="inline-flex items-center text-sm text-slate-500">
          <ChevronLeft className="size-4" />
          Back
        </button>
      ) : null}

      <div className="mt-1 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">{floorId ? 'Rooms on this floor' : 'All rooms'}</h1>
        {floorId ? (
          <Button size="sm" onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1 size-4" />
            Add room
          </Button>
        ) : null}
      </div>

      {floorId ? (
        <Link href="/admin/rooms" className="mt-1 inline-block text-sm text-slate-500 underline">
          Show all rooms
        </Link>
      ) : (
        <p className="mt-1 text-sm text-slate-500">To add a room, open a floor from Properties.</p>
      )}

      <Input
        className="mt-3 max-w-sm"
        placeholder="Search by room, building, or floor..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="-mx-4 mt-3 flex gap-2 overflow-x-auto px-4 pb-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={cn(
              'whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium',
              statusFilter === s
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {rooms.map((room) => (
          <Link
            key={room.id}
            href={`/admin/rooms/${room.id}`}
            className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-slate-900">Room {room.roomNumber}</p>
                <p className="mt-0.5 text-sm text-slate-500">{Number(room.areaSqM)} m²</p>
              </div>
              <div className="flex flex-col items-end gap-1">
                <Badge variant={toneForStatus(room.status)}>{room.status}</Badge>
                <p className="text-sm font-semibold text-slate-900">
                  {Number(room.monthlyRent).toLocaleString()} ETB
                  <span className="font-normal text-slate-500">/mo</span>
                </p>
              </div>
            </div>
          </Link>
        ))}

        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}

        {!isLoading && rooms.length === 0 ? (
          <p className="text-sm text-slate-500">No rooms match these filters.</p>
        ) : null}
      </div>

      {!isLoading && page < totalPages ? (
        <Button variant="outline" className="mt-4 w-full" onClick={() => load(page + 1, false)}>
          Load more
        </Button>
      ) : null}

      {floorId ? (
        <FormDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          title="Add room"
          fields={ROOM_FIELDS}
          submitLabel="Create room"
          onSubmit={handleCreate}
        />
      ) : null}
    </AdminShell>
  );
}

export default function AdminRoomsPage() {
  return (
    <Suspense fallback={null}>
      <AdminRoomsContent />
    </Suspense>
  );
}