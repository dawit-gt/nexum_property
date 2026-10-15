import { apiGet, apiPatch } from '../api-client';
import type { AdminRoomRequest } from '@/types/admin-room-request';

export function listRoomRequestsForReview() {
  return apiGet<AdminRoomRequest[]>('/room-requests');
}

export function approveRoomRequest(id: string, durationMonths: number) {
  return apiPatch(`/room-requests/${id}/review`, { status: 'APPROVED', durationMonths });
}

export function rejectRoomRequest(id: string, rejectionReason: string) {
  return apiPatch(`/room-requests/${id}/review`, { status: 'REJECTED', rejectionReason });
}