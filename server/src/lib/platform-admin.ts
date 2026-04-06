/**
 * Optional comma-separated `profiles.id` list of consultants who may change
 * platform settings (self-serve audit owner). When unset or empty, any
 * consultant may manage these settings (single-team deployments).
 */
export function canManagePlatformSettings(userId: string): boolean {
  const raw = process.env.PLATFORM_ADMIN_USER_IDS?.trim();
  if (!raw) {
    return true;
  }
  const allowed = new Set(
    raw
      .split(',')
      .map(s => s.trim())
      .filter(Boolean),
  );
  return allowed.has(userId);
}
