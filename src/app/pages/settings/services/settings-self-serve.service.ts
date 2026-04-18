import { api } from '../../../data/apiService';
import type { SaveSelfServeOwnerInput, SaveSelfServeOwnerOutput, SelfServePayload } from '../domain/settings.types';

export async function loadSelfServeOwner(): Promise<SelfServePayload> {
  return api.getPlatformSelfServeOwner();
}

export async function saveSelfServeOwner(input: SaveSelfServeOwnerInput): Promise<SaveSelfServeOwnerOutput> {
  return api.patchPlatformSelfServeOwner({ owner_user_id: input.ownerUserId });
}
