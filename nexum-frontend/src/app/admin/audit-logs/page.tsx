'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useAdminGuard } from '@/lib/use-admin-guard';
import { AdminShell } from '@/components/layout/admin-shell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { listAuditLogs } from '@/lib/api/admin-audit';
import { getApiErrorMessage } from '@/lib/api-client';
import { entityLabel, actionLabel, formatValueDiff } from '@/lib/audit-format';
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

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [entityType, setEntityType] = useState<(typeof ENTITY_TYPES)[number]>('ALL');
  const [action, setAction] = useState<AuditAction | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const requestIdRef = useRef(0);

  const load = useCallback(
    (targetPage: number, reset: boolean) => {
      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError(null);

      listAuditLogs({
        page: targetPage,
        limit: 20,
        entityType: entityType === 'ALL' ? undefined : entityType,
        action: action === 'ALL' ? undefined : action,
      })
        .then((result) => {
          if (requestId !== requestIdRef.current) return;
          setLogs((prev) => (reset ? result.data : [...prev, ...result.data]));
          setPage(targetPage);
          setTotalPages(result.meta.totalPages);
        })
        .catch((err) => {
          if (requestId === requestIdRef.current) setError(getApiErrorMessage(err));
        })
        .finally(() => {
          if (requestId === requestIdRef.current) setIsLoading(false);
        });
    },
    [entityType, action],
  );

  useEffect(() => {
    if (user) load(1, true);
  }, [user, load]);

  if (guardLoading) return null;

  return (
    <AdminShell>
      <h1 className="text-lg font-semibold text-slate-900">Audit log</h1>

      <div className="mt-3 flex flex-wrap gap-3">
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

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}

      <div className="mt-4 space-y-2">
        {logs.map((log) => {
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
        })}

        {isLoading &&
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-xl" />)}

        {!isLoading && logs.length === 0 ? (
          <p className="text-sm text-slate-500">No matching log entries.</p>
        ) : null}
      </div>

      {!isLoading && page < totalPages ? (
        <Button variant="outline" className="mt-4 w-full" onClick={() => load(page + 1, false)}>
          Load more
        </Button>
      ) : null}
    </AdminShell>
  );
}