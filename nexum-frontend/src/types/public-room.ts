/** A room as shown to visitors who are not logged in. */
export interface PublicRoom {
  id: string;
  roomNumber: string;
  // Decimal fields arrive as strings over JSON.
  areaSqM: string;
  pricePerSqM: string;
  monthlyRent: string;
  description: string | null;
  images: string[];
  floor: { floorNumber: number };
  building: { name: string };
  property: { name: string; address: string; city: string };
}