import { apiGet } from '../api-client';
import type { PaginatedResult } from '@/types/api';
import type { AuditAction, AuditLogEntry } from '@/types/audit';

export type ListAuditLogsParams = {
  page?: number;
  limit?: number;
  entityType?: string;
  action?: AuditAction;
  /** YYYY-MM-DD, inclusive. */
  dateFrom?: string;
  /** YYYY-MM-DD, inclusive. */
  dateTo?: string;
};

export function listAuditLogs(params: ListAuditLogsParams) {
  return apiGet<PaginatedResult<AuditLogEntry>>('/audit-logs', params);
}