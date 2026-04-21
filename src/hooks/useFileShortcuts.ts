import { useEffect } from 'react';

export interface FileShortcuts {
  onSave?: () => void;
  onOpen?: () => void;
}

export function useFileShortcuts({ onSave, onOpen }: FileShortcuts) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === 's' && onSave) {
        e.preventDefault();
        onSave();
      } else if (e.key === 'o' && onOpen) {
        e.preventDefault();
        onOpen();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onSave, onOpen]);
}
