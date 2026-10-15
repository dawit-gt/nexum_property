export function omitEmpty<T extends Record<string, string>>(values: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(values).filter(([, value]) => value.trim() !== ''),
  ) as Partial<T>;
}