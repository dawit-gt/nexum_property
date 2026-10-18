import { apiDelete, apiGet, apiPatch, apiPostForm } from '../api-client';
import type { SafeUser } from '@/types/api';

export interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  /** An empty string clears it. */
  address?: string;
  /** An empty string clears it. */
  telegramUsername?: string;
}

export function updateProfile(payload: UpdateProfilePayload) {
  return apiPatch<SafeUser>('/users/me', payload);
}

export function changeEmail(newEmail: string, currentPassword: string) {
  return apiPatch<SafeUser>('/users/me/email', { newEmail, currentPassword });
}

export function uploadAvatar(file: File) {
  const form = new FormData();
  form.append('file', file);
  return apiPostForm<SafeUser>('/users/me/avatar', form);
}

export function removeAvatar() {
  return apiDelete<SafeUser>('/users/me/avatar');
}

export function getAvatarUrl() {
  return apiGet<{ url: string | null }>('/users/me/avatar');
}