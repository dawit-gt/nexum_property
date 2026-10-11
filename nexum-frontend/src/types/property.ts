export interface Property {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Building {
  id: string;
  name: string;
  code: string;
  propertyId: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Floor {
  id: string;
  floorNumber: number;
  name: string;
  buildingId: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}