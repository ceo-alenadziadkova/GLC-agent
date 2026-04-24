import { LEGAL_DOCUMENT_VERSIONS } from '@glc/api-paths';
import { supabase } from './supabase.js';
import { logger } from './logger.js';
import type { LegalConsentKey, LegalConsentSource } from '../types/legal-consent.js';
import { LEGAL_CONSENT_KEYS } from '../types/legal-consent.js';

export type LegalConsentEventRow = {
  id: string;
  user_id: string;
  consent_key: LegalConsentKey;
  accepted: boolean;
  document_bundle_version: string;
  tos_version: string | null;
  privacy_version: string | null;
  dpa_version: string | null;
  source: LegalConsentSource;
  created_at: string;
};

export type EffectiveConsentEntry = {
  consent_key: LegalConsentKey;
  accepted: boolean;
  created_at: string;
  document_bundle_version: string;
  tos_version: string | null;
  privacy_version: string | null;
  dpa_version: string | null;
  source: LegalConsentSource;
};

export function getPublishedLegalDocumentVersions() {
  return {
    bundle: LEGAL_DOCUMENT_VERSIONS.bundle,
    terms_of_service: LEGAL_DOCUMENT_VERSIONS.termsOfService,
    privacy_policy: LEGAL_DOCUMENT_VERSIONS.privacyPolicy,
    data_processing_agreement: LEGAL_DOCUMENT_VERSIONS.dataProcessingAgreement,
    legal_notice: LEGAL_DOCUMENT_VERSIONS.legalNotice,
    cookies_policy: LEGAL_DOCUMENT_VERSIONS.cookiesPolicy,
  };
}

function isLegalConsentKey(value: string): value is LegalConsentKey {
  return (LEGAL_CONSENT_KEYS as readonly string[]).includes(value);
}

/**
 * Latest row per consent_key (by created_at descending).
 */
export function resolveEffectiveConsentRows(rows: LegalConsentEventRow[]): EffectiveConsentEntry[] {
  const sorted = [...rows].sort((a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0));
  const seen = new Set<LegalConsentKey>();
  const out: EffectiveConsentEntry[] = [];
  for (const row of sorted) {
    if (!isLegalConsentKey(row.consent_key)) continue;
    if (seen.has(row.consent_key)) continue;
    seen.add(row.consent_key);
    out.push({
      consent_key: row.consent_key,
      accepted: row.accepted,
      created_at: row.created_at,
      document_bundle_version: row.document_bundle_version,
      tos_version: row.tos_version,
      privacy_version: row.privacy_version,
      dpa_version: row.dpa_version,
      source: row.source,
    });
  }
  return out;
}

export async function listLegalConsentEventsForUser(userId: string): Promise<LegalConsentEventRow[]> {
  const { data, error } = await supabase
    .from('legal_consent_events')
    .select(
      'id, user_id, consent_key, accepted, document_bundle_version, tos_version, privacy_version, dpa_version, source, created_at',
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    logger.warn('legal_consent_events.list_failed', { user_id: userId, message: error.message });
    throw error;
  }

  return (data ?? []) as LegalConsentEventRow[];
}

export async function getEffectiveLegalConsentsForUser(userId: string): Promise<{
  published: ReturnType<typeof getPublishedLegalDocumentVersions>;
  effective: EffectiveConsentEntry[];
}> {
  const rows = await listLegalConsentEventsForUser(userId);
  return {
    published: getPublishedLegalDocumentVersions(),
    effective: resolveEffectiveConsentRows(rows),
  };
}

export async function getLatestAcceptedForKey(
  userId: string,
  key: LegalConsentKey,
): Promise<boolean | null> {
  const { data, error } = await supabase
    .from('legal_consent_events')
    .select('accepted')
    .eq('user_id', userId)
    .eq('consent_key', key)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    logger.warn('legal_consent_events.latest_failed', {
      user_id: userId,
      consent_key: key,
      message: error.message,
    });
    return null;
  }
  if (!data) return null;
  return Boolean(data.accepted);
}

/** Latest `dpa_acceptance` row is explicitly accepted (consultant / B2B processing). */
export async function isDpaAcceptanceEffectivelyTrue(userId: string): Promise<boolean> {
  return (await getLatestAcceptedForKey(userId, 'dpa_acceptance')) === true;
}

export type AppendLegalConsentEventInput = {
  consent_key: LegalConsentKey;
  accepted: boolean;
};

export async function appendLegalConsentEvents(
  userId: string,
  events: AppendLegalConsentEventInput[],
  source: LegalConsentSource,
): Promise<void> {
  const v = getPublishedLegalDocumentVersions();
  const rows = events.map(e => ({
    user_id: userId,
    consent_key: e.consent_key,
    accepted: e.accepted,
    document_bundle_version: v.bundle,
    tos_version: v.terms_of_service,
    privacy_version: v.privacy_policy,
    dpa_version: v.data_processing_agreement,
    source,
  }));

  const { error } = await supabase.from('legal_consent_events').insert(rows);
  if (error) {
    logger.warn('legal_consent_events.insert_failed', { user_id: userId, message: error.message });
    throw error;
  }
}
