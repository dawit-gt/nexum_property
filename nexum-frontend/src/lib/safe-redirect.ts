/**
 * Accepts a "where to go next" path from the address bar only if it points
 * inside this app. Anything else (another website, a protocol-relative link,
 * the login or register page itself) is ignored, so the login page can never
 * be used to send someone to a malicious site.
 */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value) return null;
  if (!value.startsWith('/') || value.startsWith('//') || value.startsWith('/\\')) return null;
  if (/[\r\n]/.test(value)) return null;
  if (value.startsWith('/login') || value.startsWith('/register')) return null;

  return value;
}

/** Builds "?next=/rooms/123" for a link, or "" when there is nothing to carry over. */
export function nextQuery(next: string | null): string {
  return next ? `?next=${encodeURIComponent(next)}` : '';
}