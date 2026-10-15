import { apiGet } from '../api-client';
import type { DashboardOverview } from '@/types/dashboard';

export function getDashboardOverview() {
  return apiGet<DashboardOverview>('/dashboard/overview');
}