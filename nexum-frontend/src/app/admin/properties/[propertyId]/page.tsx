'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { FormDialog, type FormField } from '@/components/admin/form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getProperty,
  listBuildings,
  createBuilding,
  updateProperty,
  updateBuilding,
} from '@/lib/api/admin-properties';
import { getApiErrorMessage } from '@/lib/api-client';
import { omitEmpty } from '@/lib/form-utils';
import type { Building, Property } from '@/types/property';

const BUILDING_FIELDS: FormField[] = [
  { name: 'name', label: 'Name', required: true, placeholder: 'Block A' },
  { name: 'code', label: 'Code', required: true, placeholder: 'A' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export default function AdminPropertyDetailPage() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [property, setProperty] = useState<Property | null>(null);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = () => {
    Promise.all([getProperty(propertyId), listBuildings(propertyId)])
      .then(([prop, blds]) => {
        setProperty(prop);
        setBuildings(blds);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));

    queueMicrotask(() => {
      setIsLoading(true);
      setError(null);
    });
  };

  useEffect(() => {
    if (user) load();
  }, [user, propertyId]);

  const handleCreateBuilding = async (values: Record<string, string>) => {
    await createBuilding(propertyId, {
      name: values.name,
      code: values.code,
      ...omitEmpty({ description: values.description ?? '' }),
    });
    load();
  };

  const handleToggleProperty = async () => {
    if (!property) return;
    try {
      await updateProperty(property.id, { isActive: !property.isActive });
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  const handleToggleBuilding = async (building: Building) => {
    try {
      await updateBuilding(building.id, { isActive: !building.isActive });
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <Link href="/admin/properties" className="inline-flex items-center text-sm text-slate-500">
        <ChevronLeft className="size-4" />
        Properties
      </Link>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      {isLoading || !property ? (
        <Skeleton className="mt-3 h-24 w-full rounded-xl" />
      ) : (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-lg font-semibold text-slate-900">{property.name}</h1>
              <p className="mt-0.5 text-sm text-slate-500">
                {property.address}, {property.city}
              </p>
              {property.description ? <p className="mt-2 text-sm text-slate-600">{property.description}</p> : null}
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge variant="outline">{property.code}</Badge>
              {!property.isActive ? <Badge variant="destructive">Inactive</Badge> : null}
            </div>
          </div>
          <Button variant="outline" size="sm" className="mt-3" onClick={handleToggleProperty}>
            {property.isActive ? 'Deactivate property' : 'Reactivate property'}
          </Button>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Buildings</h2>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 size-4" />
          Add building
        </Button>
      </div>

      <div className="mt-3 space-y-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : buildings.length === 0 ? (
          <p className="text-sm text-slate-500">No buildings yet.</p>
        ) : (
          buildings.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <Link href={`/admin/properties/${propertyId}/buildings/${b.id}`} className="flex-1">
                <p className="font-medium text-slate-900">{b.name}</p>
                <div className="mt-0.5 flex items-center gap-2">
                  <Badge variant="outline">{b.code}</Badge>
                  {!b.isActive ? <Badge variant="destructive">Inactive</Badge> : null}
                </div>
              </Link>
              <Button variant="ghost" size="sm" onClick={() => handleToggleBuilding(b)}>
                {b.isActive ? 'Deactivate' : 'Reactivate'}
              </Button>
            </div>
          ))
        )}
      </div>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add building"
        fields={BUILDING_FIELDS}
        submitLabel="Create building"
        onSubmit={handleCreateBuilding}
      />
    </AdminShell>
  );
}