'use client';

import { useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { DateRangeFields, ListFooter } from '@/components/admin/list-toolbar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listAuditLogs, type ListAuditLogsParams } from '@/lib/api/admin-audit';
import { entityLabel, actionLabel, formatValueDiff } from '@/lib/audit-format';
import { usePaginatedList } from '@/lib/use-paginated-list';
import type { AuditAction, AuditLogEntry } from '@/types/audit';

const ENTITY_TYPES = ['ALL', 'USER', 'DOCUMENT', 'PAYMENT', 'ROOM', 'LEASE', 'ROOM_REQUEST', 'MAINTENANCE'] as const;
const ACTIONS: (AuditAction | 'ALL')[] = [
  'ALL', 'APPROVE', 'REJECT', 'SUSPEND', 'ACTIVATE', 'TERMINATE',
  'PRICE_CHANGE', 'STATUS_CHANGE', 'CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'PASSWORD_RESET',
];

function formatTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminAuditLogsPage() {
  const { user, isLoading: guardLoading } = useAdminGuard();

  const [entityType, setEntityType] = useState<(typeof ENTITY_TYPES)[number]>('ALL');
  const [action, setAction] = useState<AuditAction | 'ALL'>('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const list = usePaginatedList<AuditLogEntry, ListAuditLogsParams>(
    listAuditLogs,
    {
      entityType: entityType === 'ALL' ? undefined : entityType,
      action: action === 'ALL' ? undefined : action,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    },
    { enabled: Boolean(user), limit: 20 },
  );

  if (guardLoading) return null;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Audit log</h1>

      <div className="mt-3 space-y-3">
        <div className="flex flex-wrap gap-3">
          <div className="w-40">
            <Select value={entityType} onValueChange={(v) => v && setEntityType(v as (typeof ENTITY_TYPES)[number])}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ENTITY_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === 'ALL' ? 'All entities' : entityLabel(t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-40">
            <Select value={action} onValueChange={(v) => v && setAction(v as AuditAction | 'ALL')}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>
                    {a === 'ALL' ? 'All actions' : actionLabel(a)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DateRangeFields
          dateFrom={dateFrom}
          dateTo={dateTo}
          onDateFromChange={setDateFrom}
          onDateToChange={setDateTo}
        />
      </div>

      {list.error ? <p className="mt-3 text-sm text-red-600">{list.error}</p> : null}

      <div className="mt-4 space-y-2">
        {list.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)
        ) : list.items.length === 0 ? (
          <p className="text-sm text-slate-500">No matching log entries.</p>
        ) : (
          list.items.map((log) => {
            const changes = [...formatValueDiff(log.oldValue), ...formatValueDiff(log.newValue)];
            return (
              <div key={log.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm text-slate-900">
                    <span className="font-medium">
                      {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : 'System'}
                    </span>{' '}
                    {actionLabel(log.action)} a {entityLabel(log.entityType).toLowerCase()}
                  </p>
                  <Badge variant="outline">{log.action}</Badge>
                </div>
                <p className="mt-1 text-xs text-slate-400">{formatTimestamp(log.timestamp)}</p>
                {changes.length > 0 ? (
                  <div className="mt-2 space-y-0.5 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                    {changes.map((line, i) => (
                      <p key={i}>{line}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <ListFooter
        shown={list.items.length}
        total={list.total}
        hasMore={list.hasMore}
        isLoadingMore={list.isLoadingMore}
        onLoadMore={list.loadMore}
      />
    </AdminShell>
  );
}