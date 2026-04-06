import { describe, it, expect } from 'vitest';
import { rootRedirectTarget } from './root-redirect';

describe('rootRedirectTarget', () => {
  it('sends OAuth code query to /login preserving search', () => {
    expect(rootRedirectTarget('?code=abc&state=x', '')).toBe('/login?code=abc&state=x');
  });

  it('sends hash access_token flow to /login preserving hash', () => {
    expect(rootRedirectTarget('', '#access_token=t&refresh_token=r')).toBe(
      '/login#access_token=t&refresh_token=r',
    );
  });

  it('sends error hash to /login', () => {
    expect(rootRedirectTarget('', '#error=access_denied')).toBe('/login#error=access_denied');
  });

  it('defaults to /dashboard when no auth callback markers', () => {
    expect(rootRedirectTarget('', '')).toBe('/dashboard');
    expect(rootRedirectTarget('?foo=1', '#section')).toBe('/dashboard');
  });
});
