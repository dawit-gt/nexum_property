import { apiGet } from '../api-client';
import type { Lease } from '@/types/lease';

export function listMyLeases() {
  return apiGet<Lease[]>('/leases/mine');
}
