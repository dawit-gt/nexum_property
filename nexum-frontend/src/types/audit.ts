export type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE' | 'APPROVE' | 'REJECT' | 'SUSPEND'
  | 'ACTIVATE' | 'TERMINATE' | 'PRICE_CHANGE' | 'STATUS_CHANGE' | 'LOGIN' | 'PASSWORD_RESET';

export interface AuditLogEntry {
  id: string;
  actorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  timestamp: string;
  actor: { id: string; firstName: string; lastName: string; email: string } | null;
}