import { apiPost, apiPatch } from '../api-client';

export function forgotPassword(email: string) {
  return apiPost('/auth/forgot-password', { email });
}

export function resetPassword(token: string, newPassword: string) {
  return apiPost('/auth/reset-password', { token, newPassword });
}

export function changePassword(currentPassword: string, newPassword: string) {
  return apiPatch('/auth/change-password', { currentPassword, newPassword });
}