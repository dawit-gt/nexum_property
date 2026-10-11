export interface DashboardOverview {
  occupancy: Record<string, number>;
  payments: Record<string, number>;
  users: Record<string, number>;
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