/**
 * Returns a normalized HTTPS URL that is safe to use as an external link.
 * Credentials embedded in URLs are rejected so they cannot be exposed through
 * browser history, calendar exports, notifications, or the popup UI.
 */
export function getSafeHttpsUrl(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      !url.hostname ||
      url.username.length > 0 ||
      url.password.length > 0
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}

export function isSafeHttpsUrl(value: string): boolean {
  return getSafeHttpsUrl(value) !== null;
}
