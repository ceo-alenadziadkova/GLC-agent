import { useState } from 'react';
import { api } from '../../../data/apiService';
import type { DiscoveryAnswers, DiscoveryFinding } from '../../../lib/discovery-flow';
import {
  hasAnyContactValue,
  toDiscoveryContactPayload,
  type DiscoverContactFields,
} from '../services';
import discoverResultsUi from '../../../locales/en/discover-page-results-ui.en.json';
import { DISCOVER_WIZARD_SAVE_TIMEOUT_MS } from '../../../config/discover-page-defaults';

export function useDiscoverySessionPersistence() {
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [contactEditKey, setContactEditKey] = useState<string | null>(null);

  const [contactSaving, setContactSaving] = useState(false);
  const [contactSaved, setContactSaved] = useState(false);
  const [contactError, setContactError] = useState<string | null>(null);

  async function saveDiscoverySession(input: {
    answers: DiscoveryAnswers;
    maturityLevel: number;
    findings: DiscoveryFinding[];
  }): Promise<void> {
    const saveTimeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('discover-session-save-timeout')), DISCOVER_WIZARD_SAVE_TIMEOUT_MS),
    );
    try {
      const result = await Promise.race([
        api.saveDiscoverySession({
          answers: input.answers,
          maturity_level: input.maturityLevel,
          findings: input.findings,
        }),
        saveTimeout,
      ]);
      setSessionToken(result.token);
      setContactEditKey(result.contact_edit_key);
    } catch {
      // Timeout or network error — results are still shown, session token not available.
    }
  }

  async function saveContact(fields: DiscoverContactFields): Promise<void> {
    if (!hasAnyContactValue(fields)) return;
    setContactSaving(true);
    setContactError(null);
    try {
      if (sessionToken && contactEditKey) {
        await api.saveDiscoveryContact(sessionToken, contactEditKey, toDiscoveryContactPayload(fields));
      } else if (sessionToken && !contactEditKey) {
        setContactError(discoverResultsUi.copy.contactMissingEditKey);
        return;
      }
      setContactSaved(true);
    } catch {
      setContactError(discoverResultsUi.copy.contactError);
    } finally {
      setContactSaving(false);
    }
  }

  return {
    sessionToken,
    contactEditKey,
    contactSaving,
    contactSaved,
    contactError,
    saveDiscoverySession,
    saveContact,
  };
}
