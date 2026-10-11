const ENTITY_LABELS: Record<string, string> = {
  USER: 'User',
  DOCUMENT: 'Document',
  PAYMENT: 'Payment',
  ROOM: 'Room',
  LEASE: 'Lease',
  ROOM_REQUEST: 'Room Request',
  MAINTENANCE: 'Maintenance',
};

export function entityLabel(entityType: string): string {
  return ENTITY_LABELS[entityType] ?? entityType;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE: 'created',
  UPDATE: 'updated',
  DELETE: 'deleted',
  APPROVE: 'approved',
  REJECT: 'rejected',
  SUSPEND: 'suspended',
  ACTIVATE: 'reactivated',
  TERMINATE: 'terminated',
  PRICE_CHANGE: 'changed price of',
  STATUS_CHANGE: 'changed status of',
  LOGIN: 'logged in',
  PASSWORD_RESET: 'reset password of',
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action.toLowerCase();
}

/** Renders an oldValue/newValue object as compact "key: value" lines, skipping noisy internal fields. */
export function formatValueDiff(value: Record<string, unknown> | null): string[] {
  if (!value) return [];
  return Object.entries(value)
    .filter(([key]) => key !== 'id')
    .map(([key, val]) => `${key}: ${val === null ? '—' : String(val)}`);
}