import { describe, it, expect } from 'vitest';
import { isLikelyTranslationOrExtensionDomCrash } from './browser-dom-crash-heuristics';

describe('isLikelyTranslationOrExtensionDomCrash', () => {
  it('returns false for empty or unrelated messages', () => {
    expect(isLikelyTranslationOrExtensionDomCrash(undefined)).toBe(false);
    expect(isLikelyTranslationOrExtensionDomCrash('Network request failed')).toBe(false);
  });

  it('detects insertBefore / NotFoundError patterns', () => {
    expect(
      isLikelyTranslationOrExtensionDomCrash(
        "NotFoundError: Failed to execute 'insertBefore' on 'Node'",
      ),
    ).toBe(true);
    expect(isLikelyTranslationOrExtensionDomCrash('NotFoundError: something')).toBe(true);
  });
});
