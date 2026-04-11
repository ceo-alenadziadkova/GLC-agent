/**
 * Intake layout surface + intake_versions write validation.
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

import { currentIntakeVersionTuple } from '@glc/intake-core';
import { validateIntakeVersionsForBriefWrite } from '@glc/intake-core';
import {
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
  it('returns public_discovery for discovery (layout-rules surface)', () => {
    expect(resolveIntakeSurfaceForPlan('discovery', 'consultant')).toBe('public_discovery');
    expect(resolveIntakeSurfaceForPlan('discovery', 'client')).toBe('public_discovery');
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

describe('validateIntakeVersionsForBriefWrite', () => {
  it('accepts omit when no row is stored (uses current)', () => {
    const cur = currentIntakeVersionTuple();
    const r = validateIntakeVersionsForBriefWrite({ stored: null });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.effective).toEqual(cur);
  });

  it('rejects unknown tuple with 400', () => {
    const r = validateIntakeVersionsForBriefWrite({
      parsedFromBody: { ...currentIntakeVersionTuple(), policyVersion: '99.0.0' },
      stored: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(400);
  });

  it('allows client to upgrade stored row to current tuple', () => {
    const cur = currentIntakeVersionTuple();
    const frozen = {
      questionBankVersion: '1.0.0',
      policyVersion: '1.0.0',
      layoutVersion: '1.1.0',
      resolverVersion: '1.0.0',
    };
    const r = validateIntakeVersionsForBriefWrite({
      parsedFromBody: cur,
      stored: frozen,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.effective).toEqual(cur);
      expect(r.migration?.reason).toBe('client_upgrade');
    }
  });

  it('409 when stored and received disagree and received is not current', () => {
    const cur = currentIntakeVersionTuple();
    const frozen = {
      questionBankVersion: '1.0.0',
      policyVersion: '1.0.0',
      layoutVersion: '1.1.0',
      resolverVersion: '1.0.0',
    };
    const r = validateIntakeVersionsForBriefWrite({
      parsedFromBody: frozen,
      stored: cur,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(409);
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
