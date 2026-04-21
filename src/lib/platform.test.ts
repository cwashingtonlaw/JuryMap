import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  isStandalonePwa,
  detectPlatform,
  shouldShowInstallPrompt,
} from './platform';

describe('isStandalonePwa', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns true when display-mode is standalone', () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q.includes('standalone') }),
      navigator: {},
    });
    expect(isStandalonePwa()).toBe(true);
  });

  it('returns false when browser does not match standalone', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      navigator: {},
    });
    expect(isStandalonePwa()).toBe(false);
  });
});

describe('detectPlatform', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('detects iPadOS Safari', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      navigator: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        maxTouchPoints: 5, // iPadOS reports macintosh UA but has touch points
      },
    });
    const p = detectPlatform();
    expect(p.family).toBe('ipados');
    expect(p.browser).toBe('safari');
  });

  it('detects macOS Chrome', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      navigator: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36',
        maxTouchPoints: 0,
      },
    });
    const p = detectPlatform();
    expect(p.family).toBe('macos');
    expect(p.browser).toBe('chrome');
  });

  it('detects iOS Safari', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      navigator: {
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        maxTouchPoints: 5,
      },
    });
    const p = detectPlatform();
    expect(p.family).toBe('ios');
    expect(p.browser).toBe('safari');
  });
});

describe('shouldShowInstallPrompt', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('returns false when already installed as PWA', () => {
    vi.stubGlobal('window', {
      matchMedia: (q: string) => ({ matches: q.includes('standalone') }),
      navigator: { userAgent: 'whatever', maxTouchPoints: 0 },
    });
    expect(shouldShowInstallPrompt()).toBe(false);
  });

  it('returns true when non-PWA Safari on iPadOS', () => {
    vi.stubGlobal('window', {
      matchMedia: () => ({ matches: false }),
      navigator: {
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Safari/605.1.15',
        maxTouchPoints: 5,
      },
    });
    expect(shouldShowInstallPrompt()).toBe(true);
  });
});
