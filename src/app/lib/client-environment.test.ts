import { describe, it, expect } from 'vitest';
import {
  inferBrowserCoarseFromUa,
  inferDeviceClassFromNavigatorParts,
  inferOsFamilyFromNavigatorParts,
} from './client-environment';

describe('inferOsFamilyFromNavigatorParts', () => {
  it('detects Windows', () => {
    expect(
      inferOsFamilyFromNavigatorParts(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Win32',
        0,
      ),
    ).toBe('windows');
  });

  it('detects macOS', () => {
    expect(
      inferOsFamilyFromNavigatorParts(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        'MacIntel',
        0,
      ),
    ).toBe('macos');
  });

  it('detects Android', () => {
    expect(
      inferOsFamilyFromNavigatorParts(
        'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 Chrome/120.0.0.0 Mobile Safari/537.36',
        'Linux armv8l',
        5,
      ),
    ).toBe('android');
  });

  it('detects iPhone as iOS', () => {
    expect(
      inferOsFamilyFromNavigatorParts(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
        'iPhone',
        5,
      ),
    ).toBe('ios');
  });

  it('detects iPad (explicit UA) as iOS family', () => {
    expect(
      inferOsFamilyFromNavigatorParts(
        'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        'MacIntel',
        5,
      ),
    ).toBe('ios');
  });

  it('detects iPadOS desktop UA pattern (MacIntel + touch)', () => {
    expect(
      inferOsFamilyFromNavigatorParts(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
        'MacIntel',
        5,
      ),
    ).toBe('ios');
  });
});

describe('inferDeviceClassFromNavigatorParts', () => {
  it('classifies Android phone as mobile', () => {
    expect(
      inferDeviceClassFromNavigatorParts(
        'Mozilla/5.0 (Linux; Android 13) Mobile Safari/537.36',
        'Linux armv8l',
        5,
      ),
    ).toBe('mobile');
  });

  it('classifies desktop Windows', () => {
    expect(
      inferDeviceClassFromNavigatorParts(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0',
        'Win32',
        0,
      ),
    ).toBe('desktop');
  });
});

describe('inferBrowserCoarseFromUa', () => {
  it('prefers Edge over Chrome substring', () => {
    expect(
      inferBrowserCoarseFromUa(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
      ),
    ).toBe('edge');
  });

  it('detects Firefox', () => {
    expect(
      inferBrowserCoarseFromUa('Mozilla/5.0 (Windows NT 10.0; rv:121.0) Gecko/20100101 Firefox/121.0'),
    ).toBe('firefox');
  });

  it('detects Safari on iOS', () => {
    expect(
      inferBrowserCoarseFromUa(
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1',
      ),
    ).toBe('safari');
  });
});
