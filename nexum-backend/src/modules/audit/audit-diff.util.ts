export interface FieldChanges {
  oldValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
}

// Prisma returns money as Decimal objects and dates as Date; compare them by
// value so an unchanged field never shows up as a change.
function normalise(value: unknown): unknown {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object' && typeof (value as { toFixed?: unknown }).toFixed === 'function') {
    return Number(String(value));
  }
  return value;
}

/**
 * The fields of `after` whose value differs from `before`, with the old and
 * new value side by side. Fields that are undefined in `after` were not
 * submitted, so they are ignored. Returns null when nothing changed.
 */
export function diffFields(before: object, after: object): FieldChanges | null {
  const previous = before as Record<string, unknown>;
  const next = after as Record<string, unknown>;
  const oldValue: Record<string, unknown> = {};
  const newValue: Record<string, unknown> = {};

  for (const key of Object.keys(next)) {
    if (next[key] === undefined) continue;

    if (JSON.stringify(normalise(previous[key])) !== JSON.stringify(normalise(next[key]))) {
      oldValue[key] = previous[key] ?? null;
      newValue[key] = next[key];
    }
  }

  return Object.keys(newValue).length > 0 ? { oldValue, newValue } : null;
}