'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft, X } from 'lucide-react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  getRoomAdmin,
  updateRoom,
  updateRoomStatus,
  uploadRoomImage,
  removeRoomImage,
  type UpdateRoomPayload,
} from '@/lib/api/admin-rooms';
import { getApiErrorMessage } from '@/lib/api-client';
import { toneForStatus } from '@/lib/status-badge';
import type { Room } from '@/types/room';

const MANUAL_STATUSES = ['AVAILABLE', 'MAINTENANCE', 'INACTIVE'] as const;
type ManualStatus = (typeof MANUAL_STATUSES)[number];

export default function AdminRoomDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [room, setRoom] = useState<Room | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [roomNumber, setRoomNumber] = useState('');
  const [areaSqM, setAreaSqM] = useState('');
  const [pricePerSqM, setPricePerSqM] = useState('');
  const [description, setDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [statusChoice, setStatusChoice] = useState<ManualStatus>('AVAILABLE');
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Loads a room into both the display state AND the edit form fields.
  const applyRoom = (r: Room) => {
    setRoom(r);
    setRoomNumber(r.roomNumber);
    setAreaSqM(r.areaSqM);
    setPricePerSqM(r.pricePerSqM);
    setDescription(r.description ?? '');
    if ((MANUAL_STATUSES as readonly string[]).includes(r.status)) {
      setStatusChoice(r.status as ManualStatus);
    }
  };

  useEffect(() => {
    if (!user) return;
    getRoomAdmin(roomId)
      .then(applyRoom)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, roomId]);

  const area = Number(areaSqM);
  const price = Number(pricePerSqM);
  const previewRent = area > 0 && price > 0 ? Math.round(area * price * 100) / 100 : null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    setError(null);
    setNotice(null);

    if (!(area > 0) || !(price > 0)) {
      setError('Area and price per m² must be greater than zero');
      return;
    }

    // Send ONLY fields that actually changed. The backend logs a PRICE_CHANGE
    // audit entry whenever area/price are present in the request, so always
    // sending them would create false "price change" entries every time
    // someone just edits the description.
    const payload: UpdateRoomPayload = {};
    if (roomNumber !== room.roomNumber) payload.roomNumber = roomNumber;
    if (area !== Number(room.areaSqM)) payload.areaSqM = area;
    if (price !== Number(room.pricePerSqM)) payload.pricePerSqM = price;
    if (description !== (room.description ?? '')) payload.description = description;

    if (Object.keys(payload).length === 0) {
      setNotice('No changes to save');
      return;
    }

    setIsSaving(true);
    try {
      applyRoom(await updateRoom(roomId, payload));
      setNotice('Room updated');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async () => {
    setError(null);
    setNotice(null);
    setIsUpdatingStatus(true);
    try {
      const updated = await updateRoomStatus(roomId, statusChoice);
      setRoom(updated);
      setNotice(`Status changed to ${updated.status}`);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setNotice(null);
    setIsUploading(true);
    try {
      setRoom(await uploadRoomImage(roomId, file));
      setNotice('Photo uploaded');
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = async (url: string) => {
    if (!window.confirm('Remove this photo?')) return;
    setError(null);
    setNotice(null);
    try {
      setRoom(await removeRoomImage(roomId, url));
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  if (guardLoading) return null;

  // RESERVED and OCCUPIED are driven by the request/lease workflow, so manual
  // changes are locked here (the backend only blocks OCCUPIED, but changing a
  // RESERVED room by hand would strand its pending request).
  const statusLocked = room?.status === 'OCCUPIED' || room?.status === 'RESERVED';

  return (
    <AdminShell>
      <button onClick={() => router.back()} className="inline-flex items-center text-sm text-slate-500">
        <ChevronLeft className="size-4" />
        Back
      </button>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm text-green-700">{notice}</p> : null}

      {isLoading || !room ? (
        <Skeleton className="mt-3 h-40 w-full rounded-xl" />
      ) : (
        <div className="mt-3 space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold text-slate-900">Room {room.roomNumber}</h1>
            <Badge variant={toneForStatus(room.status)}>{room.status}</Badge>
          </div>

          {/* Details */}
          <form onSubmit={handleSave} className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-medium text-slate-900">Details</h2>

            <div className="space-y-1.5">
              <Label htmlFor="roomNumber">Room number</Label>
              <Input id="roomNumber" required value={roomNumber} onChange={(e) => setRoomNumber(e.target.value)} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="areaSqM">Area (m²)</Label>
                <Input
                  id="areaSqM"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={areaSqM}
                  onChange={(e) => setAreaSqM(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pricePerSqM">Price per m² (ETB)</Label>
                <Input
                  id="pricePerSqM"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={pricePerSqM}
                  onChange={(e) => setPricePerSqM(e.target.value)}
                />
              </div>
            </div>

            <div className="rounded-lg bg-slate-50 p-3 text-sm">
              <p className="text-slate-500">Monthly rent</p>
              <p className="font-semibold text-slate-900">
                {previewRent !== null ? previewRent.toLocaleString() : '—'} ETB
                {previewRent !== null && previewRent !== Number(room.monthlyRent) ? (
                  <span className="ml-2 text-xs font-normal text-amber-700">
                    (currently {Number(room.monthlyRent).toLocaleString()})
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Changing area or price recalculates rent for future leases. Existing leases keep their agreed rent.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>

            <Button type="submit" className="w-full" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save changes'}
            </Button>
          </form>

          {/* Status */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-medium text-slate-900">Status</h2>
            {statusLocked ? (
              <p className="text-sm text-slate-500">
                This room is {room.status.toLowerCase()} through a room request or lease, so its status is managed by
                that workflow and can&apos;t be changed manually.
              </p>
            ) : (
              <>
                <Select
                  value={statusChoice}
                  onValueChange={(value) => {
                    if (value) setStatusChoice(value as ManualStatus);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MANUAL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isUpdatingStatus || statusChoice === room.status}
                  onClick={handleStatusUpdate}
                >
                  {isUpdatingStatus ? 'Updating...' : 'Update status'}
                </Button>
                <p className="text-xs text-slate-400">
                  INACTIVE hides the room from tenants and from new requests. You can bring it back to AVAILABLE any time.
                </p>
              </>
            )}
          </div>

          {/* Photos */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-medium text-slate-900">Photos</h2>

            {room.images.length === 0 ? (
              <p className="text-sm text-slate-500">No photos yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {room.images.map((url) => (
                  <div key={url} className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Room ${room.roomNumber}`} className="aspect-square w-full rounded-lg object-cover" />
                    <button
                      onClick={() => handleRemoveImage(url)}
                      className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-black/60 text-white"
                      aria-label="Remove photo"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="photo">{isUploading ? 'Uploading...' : 'Add a photo (JPG or PNG, max 5MB)'}</Label>
              <Input
                id="photo"
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png"
                disabled={isUploading}
                onChange={handleFileChange}
              />
            </div>
          </div>
        </div>
      )}
    </AdminShell>
  );
}