import { apiGet, apiPost } from '../api-client';
import type { PaginatedResult } from '@/types/api';
import type { Room } from '@/types/room';

export interface ListRoomsParams {
  page?: number;
  limit?: number;
  search?: string;
}

export function listRooms(params: ListRoomsParams) {
  return apiGet<PaginatedResult<Room>>('/rooms', params);
}

export function getRoom(id: string) {
  return apiGet<Room>(`/rooms/${id}`);
}

export interface CreateRoomRequestPayload {
  roomId: string;
  desiredStartDate: string;
  note?: string;
}

export function createRoomRequest(payload: CreateRoomRequestPayload) {
  return apiPost('/room-requests', payload);
}
