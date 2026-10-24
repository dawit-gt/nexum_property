export interface DashboardOverview {
  occupancy: Record<string, number>;
  payments: Record<string, number>;
  users: Record<string, number>;
  /** What the active leases add up to per month, if every tenant pays. */
  expectedMonthlyRent: number;
  pendingActions: {
    pendingRegistrations: number;
    pendingDocuments: number;
    pendingPayments: number;
    pendingRoomRequests: number;
    pendingMaintenance: number;
    unreadMessages: number;
    total: number;
  };
}

export interface MonthlyIncomePoint {
  /** YYYY-MM */
  month: string;
  /** For charts, e.g. "Mar 2026" */
  label: string;
  total: number;
}