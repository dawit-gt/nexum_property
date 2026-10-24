import { apiGet } from '../api-client';
import type { DashboardOverview, MonthlyIncomePoint } from '@/types/dashboard';

export function getDashboardOverview() {
  return apiGet<DashboardOverview>('/dashboard/overview');
}

export function getMonthlyIncome(months = 6) {
  return apiGet<MonthlyIncomePoint[]>('/dashboard/income', { months });
}