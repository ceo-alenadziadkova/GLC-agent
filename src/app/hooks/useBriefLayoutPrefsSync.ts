import { useEffect, useRef } from 'react';
import { BRIEF_LAYOUT_PREFS_CHANGED_EVENT } from '../lib/client-brief-layout-preference';

/**
 * Re-run when brief layout keys change in another tab (`storage`) or when
 * defaults are updated from Settings (`BRIEF_LAYOUT_PREFS_CHANGED_EVENT`, same tab).
 */
export function useBriefLayoutPrefsSync(storageKeys: string[], onSync: () => void) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;
  const keysRef = useRef(storageKeys);
  keysRef.current = storageKeys;
  const keysDep = storageKeys.join('\0');

  useEffect(() => {
    const run = () => {
      onSyncRef.current();
    };
    window.addEventListener(BRIEF_LAYOUT_PREFS_CHANGED_EVENT, run);
    const onStorage = (e: StorageEvent) => {
      if (!e.key) {
        return;
      }
      if (keysRef.current.includes(e.key)) {
        run();
      }
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener(BRIEF_LAYOUT_PREFS_CHANGED_EVENT, run);
      window.removeEventListener('storage', onStorage);
    };
  }, [keysDep]);
}
