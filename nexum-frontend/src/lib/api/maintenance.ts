import { apiGet, apiPostForm } from '../api-client';
import type { MaintenanceRequest } from '@/types/maintenance';

export function listMyMaintenanceRequests() {
  return apiGet<MaintenanceRequest[]>('/maintenance/mine');
}

export interface CreateMaintenancePayload {
  roomId: string;
  issueTitle: string;
  description: string;
  file?: File;
}

export function createMaintenanceRequest(payload: CreateMaintenancePayload) {
  const formData = new FormData();
  formData.append('roomId', payload.roomId);
  formData.append('issueTitle', payload.issueTitle);
  formData.append('description', payload.description);
  if (payload.file) formData.append('file', payload.file);
  return apiPostForm<MaintenanceRequest>('/maintenance', formData);
}