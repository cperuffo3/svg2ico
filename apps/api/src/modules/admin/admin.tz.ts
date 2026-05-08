/**
 * Validates an IANA timezone string. Falls back to UTC for missing/invalid input.
 * Used to safely accept a client-provided timezone before passing it to Postgres
 * via `AT TIME ZONE`.
 */
export function validateTimezone(tz: string | undefined | null): string {
  if (!tz) return 'UTC';
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return tz;
  } catch {
    return 'UTC';
  }
}

/**
 * Returns the current calendar date in the given IANA timezone, formatted as YYYY-MM-DD.
 */
export function todayInTimezone(tz: string): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '';
  return `${get('year')}-${get('month')}-${get('day')}`;
}
