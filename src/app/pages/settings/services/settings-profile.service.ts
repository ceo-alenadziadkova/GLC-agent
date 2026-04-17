import { api } from '../../../data/apiService';
import type { SaveProfileInput } from '../domain/settings.types';

export async function saveProfileName(input: SaveProfileInput): Promise<void> {
  await api.patchProfile({ full_name: input.fullName });
}
