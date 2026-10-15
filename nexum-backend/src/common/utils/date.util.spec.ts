import { addMonthsMinusOneDay, addOneDay } from './date.util';

const d = (iso: string) => new Date(`${iso}T00:00:00.000Z`);
const iso = (date: Date) => date.toISOString().slice(0, 10);

describe('addOneDay', () => {
  it('moves to the next day', () => {
    expect(iso(addOneDay(d('2026-03-10')))).toBe('2026-03-11');
  });

  it('rolls over month and year ends', () => {
    expect(iso(addOneDay(d('2026-01-31')))).toBe('2026-02-01');
    expect(iso(addOneDay(d('2026-12-31')))).toBe('2027-01-01');
  });

  it('handles leap day', () => {
    expect(iso(addOneDay(d('2028-02-28')))).toBe('2028-02-29');
    expect(iso(addOneDay(d('2028-02-29')))).toBe('2028-03-01');
  });
});

describe('addMonthsMinusOneDay', () => {
  it('covers exactly one calendar month from the 1st', () => {
    expect(iso(addMonthsMinusOneDay(d('2026-01-01'), 1))).toBe('2026-01-31');
  });

  it('ends the day before the same day next month', () => {
    expect(iso(addMonthsMinusOneDay(d('2026-01-15'), 1))).toBe('2026-02-14');
  });

  it('handles multi-month payments', () => {
    expect(iso(addMonthsMinusOneDay(d('2026-01-01'), 3))).toBe('2026-03-31');
    expect(iso(addMonthsMinusOneDay(d('2026-01-01'), 12))).toBe('2026-12-31');
  });

  it('crosses the year boundary', () => {
    expect(iso(addMonthsMinusOneDay(d('2026-11-10'), 3))).toBe('2027-02-09');
  });

  it('does not overflow into March when starting on Jan 31', () => {
    // Date#setMonth would give 2026-03-02 here
    expect(iso(addMonthsMinusOneDay(d('2026-01-31'), 1))).toBe('2026-02-27');
  });

  it('does not overflow when starting on Jan 30', () => {
    expect(iso(addMonthsMinusOneDay(d('2026-01-30'), 1))).toBe('2026-02-27');
  });

  it('handles a leap-year February', () => {
    expect(iso(addMonthsMinusOneDay(d('2028-01-31'), 1))).toBe('2028-02-28');
  });

  it('keeps chained payments gap-free and anchored to the lease start day', () => {
    const anchor = 31;
    const p1Start = d('2026-01-31');
    const p1End = addMonthsMinusOneDay(p1Start, 1, anchor);
    const p2Start = addOneDay(p1End);
    const p2End = addMonthsMinusOneDay(p2Start, 1, anchor);
    const p3Start = addOneDay(p2End);

    expect(iso(p1End)).toBe('2026-02-27');
    expect(iso(p2Start)).toBe('2026-02-28');
    expect(iso(p2End)).toBe('2026-03-30');
    expect(iso(p3Start)).toBe('2026-03-31');
  });
});