const MS_PER_DAY = 86_400_000;

/** Adds whole days using UTC arithmetic, so the server's timezone never matters. */
export function addDaysUtc(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function addOneDay(date: Date): Date {
  return addDaysUtc(date, 1);
}

function daysInMonthUtc(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

/**
 * Last day covered by a payment of `months` months that starts on `start`.
 *
 * The period ends the day before the same day-of-month, `months` later.
 * When that day doesn't exist in the target month (e.g. the 31st in
 * February) it is clamped to the month's last day, instead of rolling over
 * into the next month the way Date#setMonth does.
 *
 * `anchorDay` is the day-of-month the lease started on. Passing it keeps a
 * lease that started on the 31st billing on the 31st (or the month's last
 * day) across chained payments, instead of drifting to the 28th for good.
 */
export function addMonthsMinusOneDay(
  start: Date,
  months: number,
  anchorDay: number = start.getUTCDate(),
): Date {
  const totalMonths =
    start.getUTCFullYear() * 12 + start.getUTCMonth() + months;
  const year = Math.floor(totalMonths / 12);
  const month = totalMonths % 12;
  const day = Math.min(anchorDay, daysInMonthUtc(year, month));

  const sameDayLater = new Date(
    Date.UTC(
      year,
      month,
      day,
      start.getUTCHours(),
      start.getUTCMinutes(),
      start.getUTCSeconds(),
      start.getUTCMilliseconds(),
    ),
  );

  return addDaysUtc(sameDayLater, -1);
}