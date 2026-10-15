export type RoomStatus = 'AVAILABLE' | 'RESERVED' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE';

export interface Room {
  id: string;
  roomNumber: string;
  floorId: string;
  buildingId: string;
  propertyId: string;
  // Decimal fields serialize as strings over JSON — parse with Number() when doing math/formatting.
  areaSqM: string;
  pricePerSqM: string;
  monthlyRent: string;
  description: string | null;
  images: string[];
  status: RoomStatus;
  reservationExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}