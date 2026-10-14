'use client';

import { useEffect, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listProperties, listBuildings } from '@/lib/api/admin-properties';
import { listFloors } from '@/lib/api/admin-properties';
import type { Building, Floor, Property } from '@/types/property';

interface LocationPickerProps {
  level: 'property' | 'building' | 'floor';
  onChange: (id: string | undefined) => void;
}

/**
 * Renders the minimum chain of selects needed for the requested level:
 * "property" shows one select, "building" shows property -> building,
 * "floor" shows property -> building -> floor. Only the deepest id is
 * reported to the parent via onChange.
 */
export function LocationPicker({ level, onChange }: LocationPickerProps) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyId, setPropertyId] = useState<string>('');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [buildingId, setBuildingId] = useState<string>('');
  const [floors, setFloors] = useState<Floor[]>([]);
  const [floorId, setFloorId] = useState<string>('');

  useEffect(() => {
    listProperties().then(setProperties);
  }, []);

  useEffect(() => {
    // Defer resets so they are not synchronous setState in the effect body
    queueMicrotask(() => {
      setBuildingId('');
      setBuildings([]);
    });
    if (propertyId && level !== 'property') {
      listBuildings(propertyId).then(setBuildings);
    }
  }, [propertyId, level]);

  useEffect(() => {
    queueMicrotask(() => {
      setFloorId('');
      setFloors([]);
    });
    if (buildingId && level === 'floor') {
      listFloors(buildingId).then(setFloors);
    }
  }, [buildingId, level]);

  useEffect(() => {
    if (level === 'property') onChange(propertyId || undefined);
    else if (level === 'building') onChange(buildingId || undefined);
    else onChange(floorId || undefined);
  }, [level, propertyId, buildingId, floorId, onChange]);

  return (
    <div className="space-y-2">
      <Select value={propertyId} onValueChange={(v) => v && setPropertyId(v)}>
        <SelectTrigger className="w-full">
          <SelectValue placeholder="Select a property" />
        </SelectTrigger>
        <SelectContent>
          {properties.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {level !== 'property' && propertyId ? (
        <Select value={buildingId} onValueChange={(v) => v && setBuildingId(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a building" />
          </SelectTrigger>
          <SelectContent>
            {buildings.map((b) => (
              <SelectItem key={b.id} value={b.id}>
                {b.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}

      {level === 'floor' && buildingId ? (
        <Select value={floorId} onValueChange={(v) => v && setFloorId(v)}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select a floor" />
          </SelectTrigger>
          <SelectContent>
            {floors.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                {f.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ) : null}
    </div>
  );
}