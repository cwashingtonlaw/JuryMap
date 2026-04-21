// Browser file I/O wrapper with File System Access API (macOS Chrome/Edge)
// and download/upload fallback (iPad Safari).

export interface SaveResult {
  method: 'fsa' | 'download';
}

declare global {
  interface Window {
    showSaveFilePicker?: (opts?: unknown) => Promise<unknown>;
    showOpenFilePicker?: (opts?: unknown) => Promise<unknown[]>;
  }
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
  if (hasFileSystemAccess()) {
    try {
      const handle = (await (window.showSaveFilePicker as (opts?: unknown) => Promise<unknown>)({
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
      // User may have cancelled — stop without falling through
      if ((e as DOMException)?.name === 'AbortError') return { method: 'fsa' };
      // Any other error: continue to fallback
    }
  }
  // Download fallback
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
  if (hasFileSystemAccess()) {
    try {
      const [handle] = (await (window.showOpenFilePicker as (opts?: unknown) => Promise<unknown[]>)({
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
    }
  }
  // Fallback: use an <input type="file">
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
