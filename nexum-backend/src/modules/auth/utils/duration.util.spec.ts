import { parseDurationToMs } from './duration.util';

describe('parseDurationToMs', () => {
  it.each([
    ['500ms', 500],
    ['30s', 30_000],
    ['15m', 900_000],
    ['12h', 43_200_000],
    ['7d', 604_800_000],
  ])('parses %s', (input, expected) => {
    expect(parseDurationToMs(input)).toBe(expected);
  });

  it('is case-insensitive and tolerates whitespace', () => {
    expect(parseDurationToMs(' 15M ')).toBe(900_000);
    expect(parseDurationToMs('7 d')).toBe(604_800_000);
  });

  it.each(['', 'abc', '15', 'm15', '1.5h', '-5m', '10y'])(
    'rejects invalid input "%s"',
    (input) => {
      expect(() => parseDurationToMs(input)).toThrow('Invalid duration');
    },
  );
});
