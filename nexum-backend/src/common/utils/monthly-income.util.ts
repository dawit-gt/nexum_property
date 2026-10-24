export interface MonthlyIncomePoint {
  /** YYYY-MM in Addis Ababa time. */
  month: string;
  /** For charts, e.g. "Mar 2026". */
  label: string;
  total: number;
}

const ADDIS_OFFSET_MS = 3 * 60 * 60 * 1000;
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/** The first instant (Addis Ababa midnight) of the oldest month in the window. */
export function incomeWindowStart(months: number, now: Date): Date {
  const addisNow = new Date(now.getTime() + ADDIS_OFFSET_MS);
  return new Date(
    Date.UTC(addisNow.getUTCFullYear(), addisNow.getUTCMonth() - (months - 1), 1) -
      ADDIS_OFFSET_MS,
  );
}

/**
 * Sums approved payments into calendar months (Addis Ababa time), oldest
 * first, including months with no income so the chart has no gaps.
 */
export function buildMonthlyIncome(
  payments: { amount: { toString(): string } | number | string; paymentDate: Date }[],
  months: number,
  now: Date = new Date(),
): MonthlyIncomePoint[] {
  const addisNow = new Date(now.getTime() + ADDIS_OFFSET_MS);
  const points: MonthlyIncomePoint[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(
      Date.UTC(addisNow.getUTCFullYear(), addisNow.getUTCMonth() - i, 1),
    );
    const year = d.getUTCFullYear();
    const monthIndex = d.getUTCMonth();

    points.push({
      month: `${year}-${String(monthIndex + 1).padStart(2, '0')}`,
      label: `${MONTH_NAMES[monthIndex]} ${year}`,
      total: 0,
    });
  }

  const byMonth = new Map(points.map((p) => [p.month, p]));

  for (const payment of payments) {
    const addisDate = new Date(payment.paymentDate.getTime() + ADDIS_OFFSET_MS);
    const key = `${addisDate.getUTCFullYear()}-${String(addisDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const point = byMonth.get(key);

    if (point) point.total += Number(payment.amount.toString());
  }

  for (const point of points) {
    point.total = Math.round(point.total * 100) / 100;
  }

  return points;
}
