import { apiGet, apiPatch, apiPost } from '../api-client';
import type { Building, Floor, Property } from '@/types/property';

// ---------- Properties ----------
export function listProperties() {
  return apiGet<Property[]>('/properties');
}

export function getProperty(id: string) {
  return apiGet<Property>(`/properties/${id}`);
}

export function createProperty(payload: {
  name: string;
  code: string;
  address: string;
  city?: string;
  description?: string;
}) {
  return apiPost<Property>('/properties', payload);
}

export function updateProperty(
  id: string,
  payload: Partial<{ name: string; address: string; city: string; description: string; isActive: boolean }>,
) {
  return apiPatch<Property>(`/properties/${id}`, payload);
}

// ---------- Buildings ----------
export function listBuildings(propertyId: string) {
  return apiGet<Building[]>(`/properties/${propertyId}/buildings`);
}

export function getBuilding(id: string) {
  return apiGet<Building>(`/buildings/${id}`);
}

export function createBuilding(propertyId: string, payload: { name: string; code: string; description?: string }) {
  return apiPost<Building>(`/properties/${propertyId}/buildings`, payload);
}

export function updateBuilding(id: string, payload: Partial<{ name: string; description: string; isActive: boolean }>) {
  return apiPatch<Building>(`/buildings/${id}`, payload);
}

// ---------- Floors ----------
export function listFloors(buildingId: string) {
  return apiGet<Floor[]>(`/buildings/${buildingId}/floors`);
}

export function createFloor(buildingId: string, payload: { floorNumber: number; name: string }) {
  return apiPost<Floor>(`/buildings/${buildingId}/floors`, payload);
}

export function updateFloor(id: string, payload: Partial<{ name: string; isActive: boolean }>) {
  return apiPatch<Floor>(`/floors/${id}`, payload);
}