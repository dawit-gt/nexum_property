/**
 * Parses simple duration strings like '15m', '7d', '12h', '30s' into
 * milliseconds. Deliberately minimal — just enough for JWT_*_EXPIRY env
 * vars — rather than pulling in the `ms` package for one conversion.
 */
export function parseDurationToMs(input: string): number {
  const match = /^(\d+)\s*(ms|s|m|h|d)$/i.exec(input.trim());
  if (!match) {
    throw new Error(
      `Invalid duration "${input}" — expected formats like 15m, 7d, 12h`,
    );
  }
  const value = Number(match[1]);
  const unit = match[2].toLowerCase();
  const unitMs: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * unitMs[unit];
}
