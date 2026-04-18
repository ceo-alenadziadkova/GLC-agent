/**
 * Locale-aware display for intake token timestamps (submitted_at / expires_at).
 */
export function formatIntakeBriefSavedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}
