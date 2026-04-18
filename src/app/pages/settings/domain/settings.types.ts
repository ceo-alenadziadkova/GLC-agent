import type { api } from '../../../data/apiService';
import type { ClientBriefLayoutStored } from '../../../lib/client-brief-layout-preference';

export type SettingsTab = 'general' | 'bank-studio';

export type NotificationPrefs = {
  auditStatusReminders: boolean;
  productUpdates: boolean;
};

export type SelfServePayload = Awaited<ReturnType<typeof api.getPlatformSelfServeOwner>>;

export type SaveSelfServeOwnerInput = {
  ownerUserId: string | null;
};

export type SaveSelfServeOwnerOutput = Awaited<ReturnType<typeof api.patchPlatformSelfServeOwner>>;

export type BriefLayoutSelection = ClientBriefLayoutStored | null;

export type SaveProfileInput = {
  fullName: string | null;
};
