'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ChevronLeft, Plus } from 'lucide-react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import {
  FormDialog,
  type FormField,
} from '@/components/admin/form-dialog';
import { Badge } from '@/components/ui/badge';
import {
  Button,
  buttonVariants,
} from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  getBuilding,
  listFloors,
  createFloor,
  updateFloor,
} from '@/lib/api/admin-properties';
import { getApiErrorMessage } from '@/lib/api-client';
import type { Building, Floor } from '@/types/property';

const FLOOR_FIELDS: FormField[] = [
  {
    name: 'floorNumber',
    label:
      'Floor number (0 = ground, negative = basement)',
    type: 'number',
    required: true,
    placeholder: '1',
  },
  {
    name: 'name',
    label: 'Name',
    required: true,
    placeholder: 'First Floor',
  },
];

export default function AdminBuildingDetailPage() {
  const {
    propertyId,
    buildingId,
  } = useParams<{
    propertyId: string;
    buildingId: string;
  }>();

  const {
    user,
    isLoading: guardLoading,
  } = useAdminGuard();

  const [building, setBuilding] =
    useState<Building | null>(null);
  const [floors, setFloors] = useState<Floor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] =
    useState<string | null>(null);
  const [dialogOpen, setDialogOpen] =
    useState(false);

  const load = () => {
    setIsLoading(true);

    Promise.all([
      getBuilding(buildingId),
      listFloors(buildingId),
    ])
      .then(([bld, flrs]) => {
        setBuilding(bld);
        setFloors(flrs);
      })
      .catch((err) =>
        setError(getApiErrorMessage(err)),
      )
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (user) load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, buildingId]);

  const handleCreateFloor = async (
    values: Record<string, string>,
  ) => {
    await createFloor(buildingId, {
      floorNumber: Number(values.floorNumber),
      name: values.name,
    });

    load();
  };

  const handleToggleFloor = async (floor: Floor) => {
    try {
      await updateFloor(floor.id, {
        isActive: !floor.isActive,
      });

      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    }
  };

  if (guardLoading) return null;

  return (
    <AdminShell>
      <Link
        href={`/admin/properties/${propertyId}`}
        className="inline-flex items-center text-sm text-slate-500"
      >
        <ChevronLeft className="size-4" />
        Back to property
      </Link>

      {error ? (
        <p className="mt-3 text-sm text-red-600">
          {error}
        </p>
      ) : null}

      {isLoading || !building ? (
        <Skeleton className="mt-3 h-16 w-full rounded-xl" />
      ) : (
        <div className="mt-3">
          <h1 className="text-lg font-semibold text-slate-900">
            {building.name}
          </h1>

          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline">
              {building.code}
            </Badge>

            {!building.isActive ? (
              <Badge variant="destructive">
                Inactive
              </Badge>
            ) : null}
          </div>
        </div>
      )}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">
          Floors
        </h2>

        <Button
          size="sm"
          onClick={() => setDialogOpen(true)}
        >
          <Plus className="mr-1 size-4" />
          Add floor
        </Button>
      </div>

      <div className="mt-3 space-y-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full rounded-xl" />
        ) : floors.length === 0 ? (
          <p className="text-sm text-slate-500">
            No floors yet.
          </p>
        ) : (
          floors.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {f.name}
                </p>

                <div className="mt-0.5 flex items-center gap-2">
                  <span className="text-sm text-slate-500">
                    Floor {f.floorNumber}
                  </span>

                  {!f.isActive ? (
                    <Badge variant="destructive">
                      Inactive
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Link
                  href={`/admin/rooms?floorId=${f.id}`}
                  className={buttonVariants({
                    variant: 'outline',
                    size: 'sm',
                  })}
                >
                  Rooms
                </Link>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    handleToggleFloor(f)
                  }
                >
                  {f.isActive
                    ? 'Deactivate'
                    : 'Reactivate'}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <FormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        title="Add floor"
        fields={FLOOR_FIELDS}
        submitLabel="Create floor"
        onSubmit={handleCreateFloor}
      />
    </AdminShell>
  );
}