import { getPlatformRuntimePolicySnapshot, setPlatformRuntimePolicyPatch } from '../../lib/platform-runtime-settings.js';
import type { PlatformRuntimePolicyPatchField } from '../../config/platform-runtime-policy.js';

export type PlatformRuntimePolicyPatch = Partial<Record<PlatformRuntimePolicyPatchField, number | null>>;

export async function getPlatformRuntimePolicyView() {
  return getPlatformRuntimePolicySnapshot();
}

export async function patchPlatformRuntimePolicy(patch: PlatformRuntimePolicyPatch, actorUserId: string) {
  return setPlatformRuntimePolicyPatch(patch, actorUserId);
}
