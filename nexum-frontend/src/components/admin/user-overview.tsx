'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getUserOverview } from '@/lib/api/admin-users';
import { getDocument } from '@/lib/api/admin-documents';
import { getApiErrorMessage } from '@/lib/api-client';
import { PAYMENT_TONE_STYLES, formatDate, paymentState } from '@/lib/lease-utils';
import { toneForStatus } from '@/lib/status-badge';
import { cn } from '@/lib/utils';
import type {
  OverviewDocument,
  OverviewRoom,
  UserOverview as UserOverviewData,
} from '@/types/user-overview';

function Section({ title, count, children }: { title: string; count?: number; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="font-medium text-slate-900">
        {title}
        {count !== undefined ? <span className="ml-2 text-sm font-normal text-slate-400">{count}</span> : null}
      </h2>
      {children}
    </section>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-slate-500">{children}</p>;
}

function Stat({ value, label, attention }: { value: number; label: string; attention?: boolean }) {
  return (
    <div
      className={cn(
        'rounded-xl border bg-white p-3 shadow-sm',
        attention && value > 0 ? 'border-amber-300' : 'border-slate-200',
      )}
    >
      <p className="text-xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
    </div>
  );
}

function location(room: OverviewRoom) {
  return `${room.property.name} › ${room.building.name} › Floor ${room.floor.floorNumber}`;
}

function typeLabel(type: string) {
  const text = type.replace(/_/g, ' ').toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function money(amount: string, currency = 'ETB') {
  return `${Number(amount).toLocaleString()} ${currency}`;
}

export function UserOverview({ userId }: { userId: string }) {
  const [data, setData] = useState<UserOverviewData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewError, setViewError] = useState<string | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    getUserOverview(userId)
      .then((overview) => {
        if (!cancelled) setData(overview);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const handleView = async (id: string) => {
    setViewError(null);
    setViewing(id);
    // Open the tab first so mobile popup blockers allow it.
    const tab = window.open('', '_blank');
    try {
      const doc = await getDocument(id);
      if (tab) tab.location.href = doc.signedUrl;
      else window.location.assign(doc.signedUrl);
    } catch (err) {
      tab?.close();
      setViewError(getApiErrorMessage(err));
    } finally {
      setViewing(null);
    }
  };

  if (error) return <p className="text-sm text-red-600">{error}</p>;

  if (!data) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  const activeLeases = data.leases.filter((l) => l.status === 'ACTIVE');
  const pastLeases = data.leases.filter((l) => l.status !== 'ACTIVE');
  const currentDocs = data.documents.filter((d) => d.isCurrent);
  const olderDocs = data.documents.filter((d) => !d.isCurrent);

  const documentRow = (doc: OverviewDocument) => (
    <li key={doc.id} className="space-y-1 rounded-lg border border-slate-100 p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-900">{doc.title}</p>
          <p className="text-xs text-slate-500">
            {typeLabel(doc.documentType)} · v{doc.version} · uploaded {formatDate(doc.createdAt)}
            {doc.reviewedAt ? ` · reviewed ${formatDate(doc.reviewedAt)}` : ''}
          </p>
        </div>
        <Badge variant={toneForStatus(doc.status)}>{doc.status}</Badge>
      </div>
      {doc.status === 'REJECTED' && doc.rejectionReason ? (
        <p className="text-sm text-red-700">Reason: {doc.rejectionReason}</p>
      ) : null}
      <Button type="button" variant="outline" size="sm" disabled={viewing === doc.id} onClick={() => handleView(doc.id)}>
        {viewing === doc.id ? 'Opening...' : 'View file'}
      </Button>
    </li>
  );

  return (
    <div className="space-y-4">
      {/* At a glance */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat value={data.summary.activeLeases} label="Active leases" />
        <Stat value={data.summary.occupiedRooms} label="Rooms occupied" />
        <Stat value={data.summary.pendingRequests} label="Pending room requests" attention />
        <Stat value={data.summary.documentsAwaitingReview} label="Documents awaiting review" attention />
        <Stat value={data.summary.pendingPayments} label="Payments awaiting review" attention />
        <Stat value={data.summary.openMaintenance} label="Open maintenance tickets" attention />
      </div>

      {/* Rooms and leases */}
      <Section title="Rooms and leases" count={data.leases.length}>
        {data.leases.length === 0 ? (
          <Empty>This person has never held a lease.</Empty>
        ) : (
          <>
            {activeLeases.length === 0 ? <Empty>No active lease right now.</Empty> : null}

            {activeLeases.map((lease) => {
              const state = paymentState(lease.paidThrough);
              return (
                <div key={lease.id} className="space-y-1.5 rounded-lg border border-slate-200 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">Room {lease.room.roomNumber}</p>
                      <p className="text-xs text-slate-500">{location(lease.room)}</p>
                    </div>
                    <Badge variant={toneForStatus(lease.status)}>{lease.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">
                    {money(lease.monthlyRent)} / month · {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                  </p>
                  <p className="text-xs text-slate-400">{lease.leaseNumber}</p>
                  <span
                    className={cn(
                      'inline-block rounded-full px-2.5 py-1 text-xs font-medium',
                      PAYMENT_TONE_STYLES[state.tone],
                    )}
                  >
                    {state.label}
                  </span>
                </div>
              );
            })}

            {pastLeases.length > 0 ? (
              <div className="space-y-2 border-t border-slate-100 pt-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Past leases</p>
                {pastLeases.map((lease) => (
                  <div key={lease.id} className="flex items-start justify-between gap-3 text-sm">
                    <div>
                      <p className="text-slate-900">
                        Room {lease.room.roomNumber}{' '}
                        <span className="text-xs text-slate-400">{lease.leaseNumber}</span>
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                        {lease.status === 'TERMINATED' && lease.terminationReason
                          ? ` · ended early: ${lease.terminationReason}`
                          : ''}
                      </p>
                    </div>
                    <Badge variant={toneForStatus(lease.status)}>{lease.status}</Badge>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        )}
      </Section>

      {/* Requests */}
      <Section title="Room requests" count={data.roomRequests.length}>
        {data.roomRequests.length === 0 ? (
          <Empty>No room requests.</Empty>
        ) : (
          <ul className="space-y-2">
            {data.roomRequests.map((req) => (
              <li key={req.id} className="space-y-1 rounded-lg border border-slate-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      Room {req.room.roomNumber} · {money(req.room.monthlyRent)} / month
                    </p>
                    <p className="text-xs text-slate-500">
                      Wants to move in {formatDate(req.desiredStartDate)} · requested {formatDate(req.createdAt)}
                    </p>
                  </div>
                  <Badge variant={toneForStatus(req.status)}>{req.status}</Badge>
                </div>
                {req.note ? <p className="text-sm text-slate-600">&ldquo;{req.note}&rdquo;</p> : null}
                {req.status === 'REJECTED' && req.rejectionReason ? (
                  <p className="text-sm text-red-700">Reason: {req.rejectionReason}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Documents */}
      <Section title="Documents uploaded" count={currentDocs.length}>
        {viewError ? <p className="text-sm text-red-600">{viewError}</p> : null}

        {currentDocs.length === 0 ? (
          <Empty>No documents uploaded yet.</Empty>
        ) : (
          <ul className="space-y-2">{currentDocs.map(documentRow)}</ul>
        )}

        {olderDocs.length > 0 ? (
          <details className="rounded-lg border border-slate-100 p-3">
            <summary className="cursor-pointer text-sm text-slate-600">
              Earlier versions ({olderDocs.length})
            </summary>
            <ul className="mt-3 space-y-2">{olderDocs.map(documentRow)}</ul>
          </details>
        ) : null}
      </Section>

      {/* Payments */}
      <Section title="Payments" count={data.paymentTotal}>
        {data.payments.length === 0 ? (
          <Empty>No payments yet.</Empty>
        ) : (
          <>
            <ul className="space-y-2">
              {data.payments.map((p) => (
                <li key={p.id} className="space-y-1 rounded-lg border border-slate-100 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">
                        {money(p.amount, p.currency)} · Room {p.room.roomNumber}
                      </p>
                      <p className="text-xs text-slate-500">
                        {p.paymentNumber} · {p.monthsCovered} month{p.monthsCovered === 1 ? '' : 's'} (
                        {formatDate(p.periodStartDate)} – {formatDate(p.periodEndDate)}) · submitted{' '}
                        {formatDate(p.createdAt)}
                      </p>
                    </div>
                    <Badge variant={toneForStatus(p.status)}>{p.status}</Badge>
                  </div>
                  {p.status === 'REJECTED' && p.rejectionReason ? (
                    <p className="text-sm text-red-700">Reason: {p.rejectionReason}</p>
                  ) : null}
                </li>
              ))}
            </ul>
            {data.paymentTotal > data.payments.length ? (
              <p className="text-xs text-slate-400">
                Showing the latest {data.payments.length} of {data.paymentTotal}. The Payments page has the rest.
              </p>
            ) : null}
          </>
        )}
      </Section>

      {/* Maintenance */}
      <Section title="Maintenance tickets" count={data.maintenanceTotal}>
        {data.maintenance.length === 0 ? (
          <Empty>No maintenance tickets.</Empty>
        ) : (
          <>
            <ul className="space-y-2">
              {data.maintenance.map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 p-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{t.issueTitle}</p>
                    <p className="text-xs text-slate-500">
                      {t.ticketNumber} · {t.room ? `Room ${t.room.roomNumber}` : 'No room'} · reported{' '}
                      {formatDate(t.createdAt)}
                      {t.resolvedAt ? ` · resolved ${formatDate(t.resolvedAt)}` : ''}
                    </p>
                  </div>
                  <Badge variant={toneForStatus(t.status)}>{t.status.replace('_', ' ')}</Badge>
                </li>
              ))}
            </ul>
            {data.maintenanceTotal > data.maintenance.length ? (
              <p className="text-xs text-slate-400">
                Showing the latest {data.maintenance.length} of {data.maintenanceTotal}.
              </p>
            ) : null}
          </>
        )}
      </Section>
    </div>
  );
}
