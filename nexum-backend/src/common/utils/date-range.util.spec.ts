import { buildDateRange } from './date-range.util';

describe('buildDateRange', () => {
  it('returns undefined when no dates are given', () => {
    expect(buildDateRange()).toBeUndefined();
    expect(buildDateRange('', '')).toBeUndefined();
  });

  it('starts the day at midnight in Addis Ababa (UTC+3)', () => {
    expect(buildDateRange('2026-03-10')?.gte?.toISOString()).toBe(
      '2026-03-09T21:00:00.000Z',
    );
  });

  it('ends the day at 23:59:59.999 in Addis Ababa', () => {
    expect(buildDateRange(undefined, '2026-03-10')?.lte?.toISOString()).toBe(
      '2026-03-10T20:59:59.999Z',
    );
  });

  it('includes the whole last day for a one-day range', () => {
    const range = buildDateRange('2026-03-10', '2026-03-10');
    expect(range?.gte?.toISOString()).toBe('2026-03-09T21:00:00.000Z');
    expect(range?.lte?.toISOString()).toBe('2026-03-10T20:59:59.999Z');
  });

  it('accepts full ISO strings by using only the date part', () => {
    expect(buildDateRange('2026-03-10T15:30:00.000Z')?.gte?.toISOString()).toBe(
      '2026-03-09T21:00:00.000Z',
    );
  });

  it('ignores an unusable date instead of throwing', () => {
    expect(buildDateRange('not-a-date')).toBeUndefined();
    expect(buildDateRange('not-a-date', '2026-03-10')?.gte).toBeUndefined();
  });
});

