// Browser + Tauri file I/O wrapper.
//
// Priority order:
//   1. Tauri native dialogs (when running inside the .app bundle)
//   2. Chromium's File System Access API (macOS Chrome/Edge, Desktop Edge)
//   3. Download + <input type="file"> fallback (Safari, iPad)

export interface SaveResult {
  method: 'tauri' | 'fsa' | 'download';
}

declare global {
  interface Window {
    showSaveFilePicker?: (opts?: unknown) => Promise<unknown>;
    showOpenFilePicker?: (opts?: unknown) => Promise<unknown[]>;
    __TAURI_INTERNALS__?: unknown;
  }
}

function isTauri(): boolean {
  return typeof window !== 'undefined' && !!window.__TAURI_INTERNALS__;
}

function hasFileSystemAccess(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.showSaveFilePicker === 'function' &&
    typeof window.showOpenFilePicker === 'function'
  );
}

export async function saveJuryFile(
  suggestedName: string,
  text: string
): Promise<SaveResult> {
  // 1. Tauri native save dialog + fs write
  if (isTauri()) {
    try {
      const [{ save }, { writeTextFile }] = await Promise.all([
        import('@tauri-apps/plugin-dialog'),
        import('@tauri-apps/plugin-fs'),
      ]);
      const path = await save({
        defaultPath: suggestedName,
        filters: [
          { name: 'Jury Selection case', extensions: ['jury'] },
          { name: 'JSON', extensions: ['json'] },
        ],
      });
      if (!path) return { method: 'tauri' }; // user cancelled
      await writeTextFile(path, text);
      return { method: 'tauri' };
    } catch (e) {
      console.error('Tauri save failed, falling back:', e);
      // fall through to browser-path
    }
  }

  // 2. Chromium File System Access API
  if (hasFileSystemAccess()) {
    try {
      const handle = (await (
        window.showSaveFilePicker as (opts?: unknown) => Promise<unknown>
      )({
        suggestedName,
        types: [
          {
            description: 'Jury Selection case file',
            accept: { 'application/json': ['.jury'] },
          },
        ],
      })) as {
        createWritable(): Promise<{
          write(data: string): Promise<void>;
          close(): Promise<void>;
        }>;
      };
      const stream = await handle.createWritable();
      await stream.write(text);
      await stream.close();
      return { method: 'fsa' };
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return { method: 'fsa' };
      // fall through
    }
  }

  // 3. Download fallback
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = suggestedName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return { method: 'download' };
}

export async function openJuryFile(): Promise<string | null> {
  // 1. Tauri native open dialog + fs read
  if (isTauri()) {
    try {
      const [{ open }, { readTextFile }] = await Promise.all([
        import('@tauri-apps/plugin-dialog'),
        import('@tauri-apps/plugin-fs'),
      ]);
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Jury Selection case', extensions: ['jury', 'json'] },
        ],
      });
      if (!selected) return null; // user cancelled
      const path = Array.isArray(selected) ? selected[0] : selected;
      return await readTextFile(path);
    } catch (e) {
      console.error('Tauri open failed, falling back:', e);
      // fall through
    }
  }

  // 2. Chromium File System Access API
  if (hasFileSystemAccess()) {
    try {
      const [handle] = (await (
        window.showOpenFilePicker as (opts?: unknown) => Promise<unknown[]>
      )({
        multiple: false,
        types: [
          {
            description: 'Jury Selection case file',
            accept: { 'application/json': ['.jury', '.json'] },
          },
        ],
      })) as {
        getFile(): Promise<Blob>;
      }[];
      const file = await handle.getFile();
      return await file.text();
    } catch (e) {
      if ((e as DOMException)?.name === 'AbortError') return null;
      // fall through
    }
  }

  // 3. Fallback: <input type="file">
  return new Promise<string | null>((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.jury,application/json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      resolve(await file.text());
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
