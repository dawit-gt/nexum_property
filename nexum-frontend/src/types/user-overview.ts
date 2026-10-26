import type { DocumentStatus, DocumentType } from './document';
import type { LeaseStatus, RequestStatus } from './lease';
import type { MaintenanceStatus } from './maintenance';
import type { PaymentStatus } from './payment';

export interface OverviewRoom {
  id: string;
  roomNumber: string;
  floor: { floorNumber: number };
  building: { name: string; code: string };
  property: { name: string };
}

export interface OverviewLease {
  id: string;
  leaseNumber: string;
  status: LeaseStatus;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  paymentSchedule: string;
  terminationDate: string | null;
  terminationReason: string | null;
  createdAt: string;
  /** End of the last approved payment period, if any. */
  paidThrough: string | null;
  room: OverviewRoom;
}

export interface OverviewRoomRequest {
  id: string;
  status: RequestStatus;
  desiredStartDate: string;
  note: string | null;
  rejectionReason: string | null;
  createdAt: string;
  room: { id: string; roomNumber: string; monthlyRent: string };
}

export interface OverviewDocument {
  id: string;
  documentType: DocumentType;
  title: string;
  fileType: string;
  fileSizeBytes: number;
  version: number;
  previousVersionId: string | null;
  status: DocumentStatus;
  rejectionReason: string | null;
  reviewedAt: string | null;
  createdAt: string;
  /** False for versions that a newer upload has replaced. */
  isCurrent: boolean;
}

export interface OverviewPayment {
  id: string;
  paymentNumber: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  monthsCovered: number;
  periodStartDate: string;
  periodEndDate: string;
  paymentDate: string;
  rejectionReason: string | null;
  createdAt: string;
  room: { roomNumber: string };
}

export interface OverviewMaintenance {
  id: string;
  ticketNumber: string;
  issueTitle: string;
  status: MaintenanceStatus;
  createdAt: string;
  resolvedAt: string | null;
  room: { roomNumber: string } | null;
}

export interface UserOverview {
  summary: {
    activeLeases: number;
    occupiedRooms: number;
    pendingRequests: number;
    documentsAwaitingReview: number;
    documentsRejected: number;
    pendingPayments: number;
    openMaintenance: number;
  };
  leases: OverviewLease[];
  roomRequests: OverviewRoomRequest[];
  documents: OverviewDocument[];
  payments: OverviewPayment[];
  paymentTotal: number;
  maintenance: OverviewMaintenance[];
  maintenanceTotal: number;
}
