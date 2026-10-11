export type RequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export type LeaseStatus = 'ACTIVE' | 'EXPIRED' | 'TERMINATED';

export interface RoomRequest {
  id: string;
  roomId: string;
  status: RequestStatus;
  desiredStartDate: string;
  note: string | null;
  rejectionReason: string | null;
  createdAt: string;
  room: { roomNumber: string };
}

export interface Lease {
  id: string;
  leaseNumber: string;
  roomId: string;
  startDate: string;
  endDate: string;
  monthlyRent: string;
  status: LeaseStatus;
  terminationDate: string | null;
  terminationReason: string | null;
  createdAt: string;
  room: { roomNumber: string };
}