import { apiDeleteWithBody, apiGet, apiPatch, apiPost, apiPostForm } from '../api-client';
import type { PaginatedResult } from '@/types/api';
import type { Room, RoomStatus } from '@/types/room';

export type ListAdminRoomsParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: RoomStatus;
  floorId?: string;
};

export function listRoomsAdmin(params: ListAdminRoomsParams) {
  return apiGet<PaginatedResult<Room>>('/rooms', params);
}

export function getRoomAdmin(id: string) {
  return apiGet<Room>(`/rooms/${id}`);
}

export function createRoom(payload: {
  floorId: string;
  roomNumber: string;
  areaSqM: number;
  pricePerSqM: number;
  description?: string;
}) {
  return apiPost<Room>('/rooms', payload);
}

export type UpdateRoomPayload = Partial<{
  roomNumber: string;
  areaSqM: number;
  pricePerSqM: number;
  description: string;
}>;

export function updateRoom(id: string, payload: UpdateRoomPayload) {
  return apiPatch<Room>(`/rooms/${id}`, payload);
}

export function updateRoomStatus(id: string, status: 'AVAILABLE' | 'MAINTENANCE' | 'INACTIVE') {
  return apiPatch<Room>(`/rooms/${id}/status`, { status });
}

export function uploadRoomImage(id: string, file: File) {
  const formData = new FormData();
  formData.append('file', file);
  return apiPostForm<Room>(`/rooms/${id}/images`, formData);
}

export function removeRoomImage(id: string, imageUrl: string) {
  return apiDeleteWithBody<Room>(`/rooms/${id}/images`, { imageUrl });
}