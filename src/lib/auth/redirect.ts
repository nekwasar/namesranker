/**
 * Safe redirect targets only. Prevents open-redirect via user-supplied URLs.
 */
export function safeRedirectPath(next: string | null, fallback: string): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) {
    return fallback;
  }
  // Only allow relative paths within the app.
  return next;
}

export function safeRedirectUrl(next: string | null, origin: string, fallback: string): URL {
  const target = safeRedirectPath(next, fallback);
  return new URL(target, origin);
}
