import { describe, it, expect } from 'vitest';
import {
  resolveEffectiveConsentRows,
  type LegalConsentEventRow,
} from '../services/legal-consent.service.js';

describe('resolveEffectiveConsentRows', () => {
  it('returns latest row per consent_key by created_at', () => {
    const rows: LegalConsentEventRow[] = [
      {
        id: '1',
        user_id: 'u',
        consent_key: 'marketing',
        accepted: true,
        document_bundle_version: 'a',
        tos_version: '1',
        privacy_version: '1',
        dpa_version: null,
        source: 'signup',
        created_at: '2026-01-01T00:00:00Z',
      },
      {
        id: '2',
        user_id: 'u',
        consent_key: 'marketing',
        accepted: false,
        document_bundle_version: 'b',
        tos_version: '1',
        privacy_version: '2',
        dpa_version: null,
        source: 'settings',
        created_at: '2026-02-01T00:00:00Z',
      },
    ];
    const eff = resolveEffectiveConsentRows(rows);
    expect(eff).toHaveLength(1);
    expect(eff[0]?.consent_key).toBe('marketing');
    expect(eff[0]?.accepted).toBe(false);
    expect(eff[0]?.created_at).toBe('2026-02-01T00:00:00Z');
  });
});
