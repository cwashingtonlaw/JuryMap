export type PlatformFamily = 'ios' | 'ipados' | 'macos' | 'windows' | 'android' | 'linux' | 'unknown';
export type BrowserId = 'safari' | 'chrome' | 'edge' | 'firefox' | 'other';

export interface PlatformInfo {
  family: PlatformFamily;
  browser: BrowserId;
}

export function isStandalonePwa(): boolean {
  try {
    return !!window.matchMedia('(display-mode: standalone)').matches;
  } catch {
    return false;
  }
}

function getUA(): string {
  try {
    return (window.navigator.userAgent ?? '').toLowerCase();
  } catch {
    return '';
  }
}

function getMaxTouchPoints(): number {
  try {
    return window.navigator.maxTouchPoints ?? 0;
  } catch {
    return 0;
  }
}

export function detectPlatform(): PlatformInfo {
  const ua = getUA();
  let family: PlatformFamily = 'unknown';
  let browser: BrowserId = 'other';

  if (/iphone|ipod/.test(ua)) family = 'ios';
  else if (/ipad/.test(ua)) family = 'ipados';
  else if (/android/.test(ua)) family = 'android';
  else if (/mac os x|macintosh/.test(ua)) {
    // iPadOS 13+ reports Macintosh UA but has touch points
    family = getMaxTouchPoints() > 1 ? 'ipados' : 'macos';
  } else if (/windows nt/.test(ua)) family = 'windows';
  else if (/linux/.test(ua)) family = 'linux';

  // Chrome detection must come BEFORE Safari because Chrome's UA also contains "safari"
  if (/edg\//.test(ua)) browser = 'edge';
  else if (/chrome\//.test(ua) && !/edg\//.test(ua)) browser = 'chrome';
  else if (/firefox\//.test(ua)) browser = 'firefox';
  else if (/safari\//.test(ua)) browser = 'safari';

  return { family, browser };
}

export function shouldShowInstallPrompt(): boolean {
  if (isStandalonePwa()) return false;
  const p = detectPlatform();
  // iPad/iOS Safari storage is eviction-prone without PWA install — strongly recommend
  if ((p.family === 'ipados' || p.family === 'ios') && p.browser === 'safari') {
    return true;
  }
  // Desktop Chrome/Edge also benefits from install; default true there too.
  if (
    (p.family === 'macos' || p.family === 'windows' || p.family === 'linux') &&
    (p.browser === 'chrome' || p.browser === 'edge')
  ) {
    return true;
  }
  return false;
}
