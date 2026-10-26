import { apiGet, apiPatch } from '../api-client';
import type { PaginatedResult, RegistrationStatus, SafeUser } from '@/types/api';
import type { UserOverview } from '@/types/user-overview';

export type ListUsersParams = {
  page?: number;
  limit?: number;
  search?: string;
  registrationStatus?: RegistrationStatus;
};

export function listUsers(params: ListUsersParams) {
  return apiGet<PaginatedResult<SafeUser>>('/users', params);
}

export function getUser(id: string) {
  return apiGet<SafeUser>(`/users/${id}`);
}

/** Rooms and leases, requests, documents, payments and maintenance for one person. */
export function getUserOverview(id: string) {
  return apiGet<UserOverview>(`/users/${id}/overview`);
}

export function reviewRegistration(id: string, status: 'APPROVED' | 'REJECTED', rejectionReason?: string) {
  return apiPatch<SafeUser>(`/users/${id}/registration`, { status, rejectionReason });
}

export function suspendUser(id: string, reason: string) {
  return apiPatch<SafeUser>(`/users/${id}/suspend`, { reason });
}

export function reactivateUser(id: string) {
  return apiPatch<SafeUser>(`/users/${id}/reactivate`);
}