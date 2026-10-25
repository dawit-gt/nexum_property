const ENTITY_LABELS: Record<string, string> = {
  USER: 'User',
  DOCUMENT: 'Document',
  PAYMENT: 'Payment',
  PROPERTY: 'Property',
  BUILDING: 'Building',
  FLOOR: 'Floor',
  ROOM: 'Room',
  LEASE: 'Lease',
  ROOM_REQUEST: 'Room Request',
  MAINTENANCE: 'Maintenance',
  MESSAGE: 'Message',
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

function show(value: unknown): string {
  return value === null || value === undefined || value === '' ? '—' : String(value);
}

/**
 * Describes what a log entry changed. Where both an old and a new value
 * exist for a field it reads "field: old → new"; otherwise just the value
 * that was recorded (for example the details of something created).
 */
export function formatChanges(
  oldValue: Record<string, unknown> | null,
  newValue: Record<string, unknown> | null,
): string[] {
  const before = oldValue ?? {};
  const after = newValue ?? {};
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)])).filter((key) => key !== 'id');

  return keys.map((key) => {
    const hasOld = key in before;
    const hasNew = key in after;

    if (hasOld && hasNew) return `${key}: ${show(before[key])} → ${show(after[key])}`;
    return `${key}: ${show(hasNew ? after[key] : before[key])}`;
  });
}