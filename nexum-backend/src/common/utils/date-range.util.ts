// Addis Ababa is UTC+3 all year (no daylight saving), so a calendar date
// typed by an admin is turned into the start/end of that day in Ethiopia.
const ADDIS_OFFSET = '+03:00';

export interface DateRange {
  gte?: Date;
  lte?: Date;
}

/**
 * Builds a Prisma date filter from two YYYY-MM-DD (or ISO) strings.
 * Both ends are inclusive. Returns undefined when neither is usable.
 */
export function buildDateRange(
  dateFrom?: string,
  dateTo?: string,
): DateRange | undefined {
  const range: DateRange = {};

  if (dateFrom) {
    const start = new Date(`${dateFrom.slice(0, 10)}T00:00:00.000${ADDIS_OFFSET}`);
    if (!Number.isNaN(start.getTime())) range.gte = start;
  }

  if (dateTo) {
    const end = new Date(`${dateTo.slice(0, 10)}T23:59:59.999${ADDIS_OFFSET}`);
    if (!Number.isNaN(end.getTime())) range.lte = end;
  }

  return range.gte || range.lte ? range : undefined;
}

/**
 * Returns the start of the current calendar month in Addis Ababa (UTC+3).
 * Used by the dashboard to scope "this month" payment totals.
 */
export function startOfCurrentMonthAddis(): Date {
  const now = new Date();
  // Shift into Addis local time, then take the 1st of that month at 00:00.
  const addisNow = new Date(now.toLocaleString('en-US', { timeZone: 'Africa/Addis_Ababa' }));
  const y = addisNow.getFullYear();
  const m = String(addisNow.getMonth() + 1).padStart(2, '0');
  return new Date(`${y}-${m}-01T00:00:00.000${ADDIS_OFFSET}`);
}

/**
 * Formats a Date as YYYY-MM-DD in the Addis Ababa calendar.
 * Used for CSV download filenames.
 */
export function toAddisDateString(date: Date): string {
  return date.toLocaleDateString('en-CA', { timeZone: 'Africa/Addis_Ababa' });
}
