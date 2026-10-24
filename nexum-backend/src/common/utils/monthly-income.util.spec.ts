import { buildMonthlyIncome, incomeWindowStart } from './monthly-income.util';
import { toAddisDateString } from './date-range.util';

const NOW = new Date('2026-03-15T09:00:00.000Z');

describe('buildMonthlyIncome', () => {
  it('returns one point per month, oldest first, including empty months', () => {
    const points = buildMonthlyIncome([], 3, NOW);
    expect(points.map((p) => p.month)).toEqual(['2026-01', '2026-02', '2026-03']);
    expect(points.map((p) => p.label)).toEqual(['Jan 2026', 'Feb 2026', 'Mar 2026']);
    expect(points.every((p) => p.total === 0)).toBe(true);
  });

  it('crosses the year boundary', () => {
    const points = buildMonthlyIncome([], 3, new Date('2026-01-10T00:00:00.000Z'));
    expect(points.map((p) => p.month)).toEqual(['2025-11', '2025-12', '2026-01']);
  });

  it('adds payments into their month and accepts decimal strings', () => {
    const points = buildMonthlyIncome(
      [
        { amount: '1500.50', paymentDate: new Date('2026-03-02T09:00:00.000Z') },
        { amount: 2000, paymentDate: new Date('2026-03-20T09:00:00.000Z') },
        { amount: '500', paymentDate: new Date('2026-02-10T09:00:00.000Z') },
      ],
      3,
      NOW,
    );
    expect(points.map((p) => p.total)).toEqual([0, 500, 3500.5]);
  });

  it('uses Addis Ababa months at the boundary', () => {
    // 21:30 UTC on Feb 28 is already 00:30 on Mar 1 in Addis Ababa.
    const points = buildMonthlyIncome(
      [{ amount: 100, paymentDate: new Date('2026-02-28T21:30:00.000Z') }],
      2,
      NOW,
    );
    expect(points.map((p) => p.total)).toEqual([0, 100]);
  });

  it('ignores payments outside the window', () => {
    const points = buildMonthlyIncome(
      [{ amount: 999, paymentDate: new Date('2025-06-01T00:00:00.000Z') }],
      3,
      NOW,
    );
    expect(points.every((p) => p.total === 0)).toBe(true);
  });
});

describe('incomeWindowStart', () => {
  it('is Addis Ababa midnight on the first day of the oldest month', () => {
    expect(incomeWindowStart(3, NOW).toISOString()).toBe('2025-12-31T21:00:00.000Z');
  });
});

describe('toAddisDateString', () => {
  it('rolls over at Addis Ababa midnight, not UTC midnight', () => {
    expect(toAddisDateString(new Date('2026-03-09T21:00:00.000Z'))).toBe('2026-03-10');
    expect(toAddisDateString(new Date('2026-03-10T20:59:59.000Z'))).toBe('2026-03-10');
  });
});
