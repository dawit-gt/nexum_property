import { apiDelete, apiGet, apiPost } from '../api-client';
import type { TelegramConnectLink, TelegramStatus } from '@/types/notification';

export function getTelegramStatus() {
  return apiGet<TelegramStatus>('/telegram/status');
}

export function startTelegramConnect() {
  return apiPost<TelegramConnectLink>('/telegram/connect');
}

export function disconnectTelegram() {
  return apiDelete('/telegram/connect');
}
