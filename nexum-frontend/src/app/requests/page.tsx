'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { AppShell } from '@/components/layout/app-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { listMyRoomRequests, cancelRoomRequest } from '@/lib/api/room-requests';
import { listMyLeases } from '@/lib/api/leases';
import { listMyMaintenanceRequests } from '@/lib/api/maintenance';
import { getApiErrorMessage } from '@/lib/api-client';
import { toneForStatus } from '@/lib/status-badge';
import { cn } from '@/lib/utils';
import type { RoomRequest, Lease } from '@/types/lease';
import type { MaintenanceRequest } from '@/types/maintenance';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const TABS = ['requests', 'maintenance'] as const;
type Tab = (typeof TABS)[number];

export default function RequestsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('requests');

  const [requests, setRequests] = useState<RoomRequest[]>([]);
  const [leases, setLeases] = useState<Lease[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [authLoading, user, router]);

  const load = () => {
    setIsLoading(true);
    setError(null);
    Promise.all([listMyRoomRequests(), listMyLeases(), listMyMaintenanceRequests()])
      .then(([reqs, leaseList, maintList]) => {
        setRequests(reqs);
        setLeases(leaseList);
        setMaintenance(maintList);
      })
      .catch((err) => setError(getApiErrorMessage(err)))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (user) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      await cancelRoomRequest(id);
      load();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setCancellingId(null);
    }
  };

  return (
    <AppShell>
      <div className="p-4">
        <h1 className="text-lg font-semibold text-slate-900">My requests</h1>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setTab('requests')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              tab === 'requests' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            Room requests
          </button>
          <button
            onClick={() => setTab('maintenance')}
            className={cn(
              'rounded-full border px-3 py-1 text-xs font-medium',
              tab === 'maintenance' ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-200 bg-white text-slate-600',
            )}
          >
            Maintenance
          </button>
        </div>

        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

        {tab === 'requests' ? (
          <div className="mt-4 space-y-6">
            <div>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 w-full rounded-xl" />
                  <Skeleton className="h-20 w-full rounded-xl" />
                </div>
              ) : requests.length === 0 ? (
                <p className="text-sm text-slate-500">No room requests yet.</p>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div key={req.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">Room {req.room.roomNumber}</p>
                          <p className="mt-0.5 text-sm text-slate-500">Move-in: {formatDate(req.desiredStartDate)}</p>
                        </div>
                        <Badge variant={toneForStatus(req.status)}>{req.status}</Badge>
                      </div>
                      {req.rejectionReason ? <p className="mt-2 text-sm text-red-600">{req.rejectionReason}</p> : null}
                      {req.status === 'PENDING' ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3"
                          disabled={cancellingId === req.id}
                          onClick={() => handleCancel(req.id)}
                        >
                          {cancellingId === req.id ? 'Cancelling...' : 'Cancel request'}
                        </Button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h2 className="text-base font-semibold text-slate-900">My leases</h2>
              {isLoading ? (
                <Skeleton className="mt-3 h-20 w-full rounded-xl" />
              ) : leases.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">No leases yet.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  {leases.map((lease) => (
                    <div key={lease.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-slate-900">Room {lease.room.roomNumber}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{lease.leaseNumber}</p>
                          <p className="mt-1 text-sm text-slate-500">
                            {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                          </p>
                        </div>
                        <Badge variant={toneForStatus(lease.status)}>{lease.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        {Number(lease.monthlyRent).toLocaleString()} ETB<span className="font-normal text-slate-500">/mo</span>
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="mt-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">Maintenance tickets</h2>
              <Button size="sm" onClick={() => router.push('/maintenance/new')}>
                New ticket
              </Button>
            </div>

            {isLoading ? (
              <div className="mt-3 space-y-2">
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            ) : maintenance.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No maintenance tickets yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {maintenance.map((m) => (
                  <div key={m.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-slate-900">{m.issueTitle}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{m.ticketNumber}</p>
                        <p className="mt-1 text-sm text-slate-600">{m.description}</p>
                      </div>
                      <Badge variant={toneForStatus(m.status)}>{m.status}</Badge>
                    </div>
                    {m.adminNotes ? <p className="mt-2 text-sm text-slate-500">Note: {m.adminNotes}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}