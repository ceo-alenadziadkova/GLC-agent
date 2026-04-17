import { canManagePlatformSettings } from '../../lib/platform-admin.js';

export async function canActorManagePlatformSettings(userId: string): Promise<boolean> {
  return canManagePlatformSettings(userId);
}
