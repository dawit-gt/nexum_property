import type { RequestStatus } from './lease';

export interface AdminRoomRequest {
  id: string;
  roomId: string;
  status: RequestStatus;
  desiredStartDate: string;
  note: string | null;
  rejectionReason: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string };
  room: { id: string; roomNumber: string; monthlyRent: string };
}