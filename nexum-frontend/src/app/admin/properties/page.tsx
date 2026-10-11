'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { FormDialog, type FormField } from '@/components/admin/form-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listProperties, createProperty } from '@/lib/api/admin-properties';
import { getApiErrorMessage } from '@/lib/api-client';
import { omitEmpty } from '@/lib/form-utils';
import type { Property } from '@/types/property';

const PROPERTY_FIELDS: FormField[] = [
  { name: 'name', label: 'Name', required: true, placeholder: 'Bole Tower' },
  { name: 'code', label: 'Code', required: true, placeholder: 'BT' },
  { name: 'address', label: 'Address', required: true },
  { name: 'city', label: 'City', placeholder: 'Addis Ababa' },
  { name: 'description', label: 'Description', type: 'textarea' },
];

export default function AdminPropertiesPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const load = () => {
    setIsLoading(true);
    listProperties()
      .then(setProperties)
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCreate = async (values: Record<string, string>) => {
    await createProperty({
      name: values.name,
      code: values.code,
      address: values.address,
      ...omitEmpty({ city: values.city ?? '', description: values.description ?? '' }),
    });
    load();
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-slate-900">Properties</h1>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="mr-1 size-4" />
          Add property
        </Button>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-3">
        {isLoading ? (
          <>
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </>
        ) : properties.length === 0 ? (
          <p className="text-sm text-slate-500">No properties yet. Add your first one.</p>
        ) : (
          properties.map((p) => (
            <Link
              key={p.id}
              href={`/admin/properties/${p.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm active:bg-slate-50"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-slate-900">{p.name}</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {p.address}, {p.city}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge variant="outline">{p.code}</Badge>
                  {!p.isActive ? <Badge variant="destructive">Inactive</Badge> : null}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add property"
        fields={PROPERTY_FIELDS}
        submitLabel="Create property"
        onSubmit={handleCreate}
      />
    </AdminShell>
  );
}