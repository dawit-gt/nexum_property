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