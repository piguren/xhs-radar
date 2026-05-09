/**
 * chrome.storage.local 抽象封装。
 * src/app/ 任何文件都不允许直接 import 'chrome'，必须经此模块。
 * 对应 docs/prd/xhs-radar-l3.md §1.1 形态无关铁律。
 */

export class StorageQuotaError extends Error {
  constructor(message: string) {
    super(`StorageQuotaError: ${message}`);
    this.name = 'StorageQuotaError';
  }
}

function lastError(): chrome.runtime.LastError | undefined {
  return chrome.runtime.lastError;
}

function classifyError(err: chrome.runtime.LastError): Error {
  const msg = err.message ?? 'Unknown chrome.storage error';
  if (/quota/i.test(msg)) return new StorageQuotaError(msg);
  return new Error(msg);
}

export function storageGet<T = unknown>(key: string): Promise<T | undefined> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (items) => {
      const err = lastError();
      if (err) {
        reject(classifyError(err));
        return;
      }
      resolve(items[key] as T | undefined);
    });
  });
}

export function storageSet<T = unknown>(key: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      const err = lastError();
      if (err) {
        reject(classifyError(err));
        return;
      }
      resolve();
    });
  });
}

export function storageRemove(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.remove(key, () => {
      const err = lastError();
      if (err) {
        reject(classifyError(err));
        return;
      }
      resolve();
    });
  });
}

export function storageOnChanged(
  handler: (
    changes: Record<string, chrome.storage.StorageChange>,
    areaName: chrome.storage.AreaName,
  ) => void,
): () => void {
  chrome.storage.onChanged.addListener(handler);
  return () => chrome.storage.onChanged.removeListener(handler);
}
