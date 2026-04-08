/**
 * Intake layout surface + version-tuple guards (brief-validator helpers and validateBriefResponses).
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('../services/supabase.js', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          maybeSingle: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
  },
}));

import { currentIntakeVersionTuple } from '../intake/core/versions.js';
import {
  checkIntakeVersionsClientMismatch,
  resolveIntakeSurfaceForPlan,
  validateBriefResponses,
  validationPerspectiveForBriefAccess,
} from '../services/brief-validator.js';

import { makeWebsitePathFullBrief } from './bank-brief-fixtures.js';

describe('validationPerspectiveForBriefAccess', () => {
  it('returns client when the request user is the linked client', () => {
    expect(validationPerspectiveForBriefAccess('consultant-1', 'client-1', 'client-1')).toBe('client');
  });

  it('returns consultant for owner or when client_id is unset', () => {
    expect(validationPerspectiveForBriefAccess('consultant-1', null, 'consultant-1')).toBe('consultant');
    expect(validationPerspectiveForBriefAccess('consultant-1', 'client-1', 'consultant-1')).toBe('consultant');
  });
});

describe('resolveIntakeSurfaceForPlan', () => {
  it('returns undefined for discovery (layout handled elsewhere)', () => {
    expect(resolveIntakeSurfaceForPlan('discovery', 'consultant')).toBeUndefined();
    expect(resolveIntakeSurfaceForPlan('discovery', 'client')).toBeUndefined();
  });

  it('maps consultant modes to consultant_interview', () => {
    expect(resolveIntakeSurfaceForPlan('self_serve', 'consultant')).toBe('consultant_interview');
    expect(resolveIntakeSurfaceForPlan('interview', 'consultant')).toBe('consultant_interview');
    expect(resolveIntakeSurfaceForPlan('pre_brief', 'consultant')).toBe('consultant_interview');
  });

  it('maps client pre_brief to client_portal', () => {
    expect(resolveIntakeSurfaceForPlan('pre_brief', 'client')).toBe('client_portal');
  });

  it('maps other client modes to client_form', () => {
    expect(resolveIntakeSurfaceForPlan('self_serve', 'client')).toBe('client_form');
    expect(resolveIntakeSurfaceForPlan('interview', 'client')).toBe('client_form');
  });
});

describe('checkIntakeVersionsClientMismatch', () => {
  it('treats missing or non-object body as ok', () => {
    expect(checkIntakeVersionsClientMismatch(undefined)).toEqual({ ok: true });
    expect(checkIntakeVersionsClientMismatch(null)).toEqual({ ok: true });
    expect(checkIntakeVersionsClientMismatch('nope')).toEqual({ ok: true });
    expect(checkIntakeVersionsClientMismatch([])).toEqual({ ok: true });
  });

  it('returns ok when all sent keys match the current engine tuple', () => {
    expect(checkIntakeVersionsClientMismatch(currentIntakeVersionTuple())).toEqual({ ok: true });
  });

  it('returns ok when object has no version keys', () => {
    expect(checkIntakeVersionsClientMismatch({ extra: 'only' })).toEqual({ ok: true });
  });

  it('returns ok:false with current tuple when a sent key disagrees', () => {
    const cur = currentIntakeVersionTuple();
    const r = checkIntakeVersionsClientMismatch({ ...cur, policyVersion: '0.0.0' });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.current).toEqual(cur);
  });
});

describe('validateBriefResponses() with surface', () => {
  it('client_form lowers recommended total vs default when c1 is eligible (website path)', () => {
    const responses = makeWebsitePathFullBrief();
    const baseline = validateBriefResponses(responses, {
      productMode: 'full',
      collectionMode: 'self_serve',
    });
    const clientForm = validateBriefResponses(responses, {
      productMode: 'full',
      collectionMode: 'self_serve',
      surface: 'client_form',
    });
    expect(clientForm.total_recommended).toBeLessThan(baseline.total_recommended);
    expect(baseline.total_required).toBe(clientForm.total_required);
  });

  it('consultant_interview keeps same recommended count as no surface for full self_serve', () => {
    const responses = makeWebsitePathFullBrief();
    const baseline = validateBriefResponses(responses, {
      productMode: 'full',
      collectionMode: 'self_serve',
    });
    const consultant = validateBriefResponses(responses, {
      productMode: 'full',
      collectionMode: 'self_serve',
      surface: 'consultant_interview',
    });
    expect(consultant.total_recommended).toBe(baseline.total_recommended);
  });
});
