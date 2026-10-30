import Link from 'next/link';
import type { PublicRoom } from '@/types/public-room';

export function RoomCard({ room }: { room: PublicRoom }) {
  const photo = room.images[0];

  return (
    <Link
      href={`/explore/${room.id}`}
      className="group block overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photo}
            alt={`Room ${room.roomNumber}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-slate-400">No photo yet</div>
        )}
      </div>

      <div className="space-y-1 p-4">
        <div className="flex items-start justify-between gap-3">
          <p className="font-medium text-slate-900">Room {room.roomNumber}</p>
          <p className="whitespace-nowrap text-sm font-semibold text-slate-900">
            {Number(room.monthlyRent).toLocaleString()} ETB
            <span className="font-normal text-slate-500">/mo</span>
          </p>
        </div>
        <p className="text-sm text-slate-500">
          {room.property.name} · {room.building.name} · Floor {room.floor.floorNumber}
        </p>
        <p className="text-xs text-slate-400">{Number(room.areaSqM).toLocaleString()} m²</p>
      </div>
    </Link>
  );
}