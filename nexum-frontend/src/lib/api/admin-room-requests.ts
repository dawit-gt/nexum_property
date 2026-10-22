import { apiGet, apiPatch } from '../api-client';
import type { AdminRoomRequest } from '@/types/admin-room-request';
import type { RequestStatus } from '@/types/lease';
import type { PaginatedResult } from '@/types/api';
import type { ListParams } from '@/types/list';

export type RoomRequestListParams = ListParams<RequestStatus>;

export function listRoomRequestsForReview(params: RoomRequestListParams) {
  return apiGet<PaginatedResult<AdminRoomRequest>>('/room-requests', params);
}

export function approveRoomRequest(id: string, durationMonths: number) {
  return apiPatch(`/room-requests/${id}/review`, { status: 'APPROVED', durationMonths });
}

export function rejectRoomRequest(id: string, rejectionReason: string) {
  return apiPatch(`/room-requests/${id}/review`, { status: 'REJECTED', rejectionReason });
}