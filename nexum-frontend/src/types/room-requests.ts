import { apiGet, apiPatch } from '@/lib/api-client';
import type { RoomRequest } from '@/types/lease';

export function listMyRoomRequests() {
  return apiGet<RoomRequest[]>('/room-requests/mine');
}

export function cancelRoomRequest(id: string) {
  return apiPatch(`/room-requests/${id}/cancel`);
}
