/**
 * Optional comma-separated `profiles.id` list of consultants who may change
 * platform settings (self-serve audit owner). When unset or empty, any
 * consultant may manage these settings (single-team deployments).
 */
export function listPlatformAdminUserIds(): string[] {
  const raw = process.env.PLATFORM_ADMIN_USER_IDS?.trim();
  if (!raw) return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export function canManagePlatformSettings(userId: string): boolean {
  const allowed = listPlatformAdminUserIds();
  if (allowed.length === 0) {
    return true;
  }
  return new Set(allowed).has(userId);
}
