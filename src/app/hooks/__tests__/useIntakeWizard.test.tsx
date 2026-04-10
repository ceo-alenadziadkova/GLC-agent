import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { act } from 'react';
import { makeWebsitePathFullBrief } from '../../../../server/src/tests/bank-brief-fixtures';
import { briefResponsesToIntakeMap, useIntakeBankMetrics, useIntakeWizard } from '../useIntakeWizard';

describe('briefResponsesToIntakeMap', () => {
  it('preserves structured cells', () => {
    const m = briefResponsesToIntakeMap({
      x: { value: 'hello', source: 'client' },
    });
    expect(m.x).toEqual({ value: 'hello', source: 'client' });
  });
});

describe('useIntakeBankMetrics', () => {
  it('derives bank coverage from partial responses', () => {
    const { result } = renderHook(() =>
      useIntakeBankMetrics({
        f1: { value: 'Grow', source: 'client' },
        a1: { value: 'Co — SaaS', source: 'client' },
        a5: { value: 'Yes, multi-page site', source: 'client' },
        intake_company_name: { value: 'Co', source: 'client' },
        intake_industry: { value: 'SaaS / Software', source: 'client' },
        intake_company_website: { value: 'https://example.com', source: 'client' },
      }),
    );
    expect(result.current.dataQualityPct).toBeGreaterThanOrEqual(0);
    expect(result.current.dataQualityPct).toBeLessThanOrEqual(100);
    expect(result.current.visibleRequiredTotal).toBeGreaterThan(0);
  });

  it('uses surface for visible recommended totals (client_form vs consultant)', () => {
    const raw = makeWebsitePathFullBrief();
    const brief = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, { value: v as never, source: 'client' as const }]),
    );
    const { result: consultant } = renderHook(() =>
      useIntakeBankMetrics(brief, 'self_serve', 'consultant_interview'),
    );
    const { result: clientForm } = renderHook(() => useIntakeBankMetrics(brief, 'self_serve', 'client_form'));
    expect(clientForm.current.visibleRecommendedTotal).toBeLessThanOrEqual(consultant.current.visibleRecommendedTotal);
    expect(consultant.current.visibleRecommendedTotal).toBeGreaterThan(clientForm.current.visibleRecommendedTotal);
  });

  it('exposes nextRecommended from plan', () => {
    const { result } = renderHook(() =>
      useIntakeBankMetrics(
        {
          f1: { value: 'Grow', source: 'client' },
          a1: { value: 'Co — SaaS', source: 'client' },
          a5: { value: 'Yes, multi-page site', source: 'client' },
          intake_company_name: { value: 'Co', source: 'client' },
          intake_industry: { value: 'SaaS / Software', source: 'client' },
          intake_company_website: { value: 'https://example.com', source: 'client' },
        },
        undefined,
        undefined,
        'full',
      ),
    );
    expect(Array.isArray(result.current.nextRecommended)).toBe(true);
  });
});

describe('useIntakeWizard', () => {
  it('exposes fewer steps on client_form than consultant_interview for website-path fixture', () => {
    const raw = makeWebsitePathFullBrief();
    const value = { ...raw };
    const { result: consultant } = renderHook(() =>
      useIntakeWizard({
        value,
        onChange: () => {},
        collectionMode: 'self_serve',
        surface: 'consultant_interview',
      }),
    );
    const { result: clientForm } = renderHook(() =>
      useIntakeWizard({
        value,
        onChange: () => {},
        collectionMode: 'self_serve',
        surface: 'client_form',
      }),
    );
    expect(clientForm.current.totalSteps).toBeLessThan(consultant.current.totalSteps);
  });

  it('exposes nextRecommended and missingForReport from buildIntakePlan', () => {
    const { result } = renderHook(() =>
      useIntakeWizard({
        value: { a2: 'hospitality', a5: 'no_website' },
        onChange: () => {},
        collectionMode: 'self_serve',
        surface: 'consultant_interview',
        productMode: 'full',
      }),
    );
    expect(Array.isArray(result.current.nextRecommended)).toBe(true);
    expect(result.current.nextRecommended.length).toBeGreaterThan(0);
    expect(Array.isArray(result.current.missingForReport)).toBe(true);
    for (const id of result.current.nextRecommended) {
      expect(result.current.visibleQuestionStubs.some(s => s.id === id)).toBe(true);
    }
  });

  it('reuses visible stubs for non-branch response edits (partial replan path)', () => {
    const base = {
      a2: 'hospitality',
      a5: 'no_website',
      f1: 'Need more leads',
    };
    const { result, rerender } = renderHook(
      ({ value }) =>
        useIntakeWizard({
          value,
          onChange: () => {},
          collectionMode: 'self_serve',
          surface: 'consultant_interview',
          productMode: 'full',
        }),
      { initialProps: { value: base } },
    );
    const prevRef = result.current.visibleQuestionStubs;
    rerender({ value: { ...base, f1: 'Need more qualified leads' } });
    expect(result.current.visibleQuestionStubs).toBe(prevRef);
  });

  it('rebuilds visible stubs when branch-driving answer changes', () => {
    const base = {
      a2: 'hospitality',
      a5: 'no_website',
    };
    const { result, rerender } = renderHook(
      ({ value }) =>
        useIntakeWizard({
          value,
          onChange: () => {},
          collectionMode: 'self_serve',
          surface: 'consultant_interview',
          productMode: 'full',
        }),
      { initialProps: { value: base } },
    );
    const prevRef = result.current.visibleQuestionStubs;
    rerender({ value: { ...base, a5: 'Yes, multi-page site' } });
    expect(result.current.visibleQuestionStubs).not.toBe(prevRef);
  });

  it('setField preserves unrelated keys across sequential updates', () => {
    const { result } = renderHook(() =>
      useIntakeWizard({
        initialMap: {
          legacy_key: { value: 'legacy', source: 'client' },
          q1: { value: 'A', source: 'consultant' },
        },
      }),
    );

    act(() => {
      result.current.setField('q1', { value: 'B', source: 'consultant' });
      result.current.setField('q2', { value: 42, source: 'consultant' });
    });

    const responses = result.current.responses as Record<string, unknown>;
    expect(responses.legacy_key).toEqual({ value: 'legacy', source: 'client' });
    expect(responses.q1).toEqual({ value: 'B', source: 'consultant' });
    expect(responses.q2).toEqual({ value: 42, source: 'consultant' });
  });
});
