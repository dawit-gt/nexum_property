import { apiGet, apiPatch } from '../api-client';
import type { PaginatedResult } from '@/types/api';
import type { AdminMaintenanceRequest, MaintenanceStatus, MaintenanceWithSignedUrl } from '@/types/maintenance';

export type ListMaintenanceParams = {
  page?: number;
  limit?: number;
  search?: string;
  status?: MaintenanceStatus;
};

export function listMaintenanceForReview(params: ListMaintenanceParams) {
  return apiGet<PaginatedResult<AdminMaintenanceRequest>>('/maintenance', params);
}

export function getMaintenanceRequest(id: string) {
  return apiGet<MaintenanceWithSignedUrl>(`/maintenance/${id}`);
}

export function updateMaintenanceStatus(
  id: string,
  status: MaintenanceStatus,
  adminNotes?: string,
  takeRoomOutOfService?: boolean,
) {
  return apiPatch<AdminMaintenanceRequest>(`/maintenance/${id}/status`, { status, adminNotes, takeRoomOutOfService });
}