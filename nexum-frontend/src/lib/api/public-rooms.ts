import { apiGet } from '../api-client';
import type { PaginatedResult } from '@/types/api';
import type { PublicRoom } from '@/types/public-room';

export type PublicRoomSort = 'newest' | 'price_asc' | 'price_desc';

export type PublicRoomListParams = {
  page?: number;
  limit?: number;
  search?: string;
  maxRent?: number;
  sort?: PublicRoomSort;
};

/** No login needed: these call the public endpoints. */
export function listPublicRooms(params: PublicRoomListParams) {
  return apiGet<PaginatedResult<PublicRoom>>('/public/rooms', params);
}

export function getPublicRoom(id: string) {
  return apiGet<PublicRoom>(`/public/rooms/${id}`);
}