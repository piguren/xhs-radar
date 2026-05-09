/**
 * useChromeStoragePersist — 把 Zustand store 同步到 chrome.storage.local。
 * 启动时 hydrate（storage -> store），运行时 debounce 200ms 写回（store -> storage）。
 *
 * 仅在 dashboard / popup 入口使用（service worker 不要调，它没有 React）。
 */
import { useEffect } from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';
import { storageGet, storageSet } from '@/services/chrome/storage';

export function useChromeStoragePersist<T>(
  store: UseBoundStore<StoreApi<T>>,
  storageKey: string,
  pickPersistable: (state: T) => Partial<T>,
): void {
  useEffect(() => {
    let cancelled = false;
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    // Hydrate
    storageGet<Partial<T>>(storageKey).then((stored) => {
      if (cancelled) return;
      if (stored && typeof stored === 'object') {
        store.setState((cur) => ({ ...cur, ...stored }) as T);
      }
    });

    // Subscribe + debounced write
    const unsub = store.subscribe((state) => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const slice = pickPersistable(state);
        storageSet(storageKey, slice).catch((err) => {
          console.error(`[xhs-radar] persist ${storageKey} failed:`, err);
        });
      }, 200);
    });

    return () => {
      cancelled = true;
      unsub();
      if (debounceTimer) clearTimeout(debounceTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}
