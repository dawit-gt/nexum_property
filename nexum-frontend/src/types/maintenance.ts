export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'REJECTED';

export interface MaintenanceRequest {
  id: string;
  ticketNumber: string;
  userId: string;
  propertyId: string;
  roomId: string | null;
  issueTitle: string;
  description: string;
  status: MaintenanceStatus;
  adminNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AdminMaintenanceRequest extends MaintenanceRequest {
  user: { id: string; firstName: string; lastName: string; email: string };
  room: { id: string; roomNumber: string } | null;
}

export interface MaintenanceWithSignedUrl extends MaintenanceRequest {
  signedUrl?: string;
  signedUrlExpiresInSeconds?: number;
}