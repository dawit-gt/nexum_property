import { apiClient, apiGet, apiPatch } from '../api-client';
import type { AdminLease, LeaseStatus } from '@/types/lease';

export function listAllLeases(status?: LeaseStatus) {
  return apiGet<AdminLease[]>('/leases', status ? { status } : undefined);
}

export function terminateLease(id: string, terminationReason: string) {
  return apiPatch(`/leases/${id}/terminate`, { terminationReason });
}

/** The CSV endpoint needs the auth header, so a plain link won't work. */
export async function downloadPaymentsCsv() {
  const res = await apiClient.get('/dashboard/payments/export', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data as Blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}