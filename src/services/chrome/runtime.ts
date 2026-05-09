/**
 * chrome.runtime 抽象封装（getURL / id / onInstalled）。
 */

export function getURL(path: string): string {
  return chrome.runtime.getURL(path);
}

export function getId(): string {
  return chrome.runtime.id;
}

export function onInstalled(
  handler: (details: chrome.runtime.InstalledDetails) => void,
): () => void {
  chrome.runtime.onInstalled.addListener(handler);
  return () => chrome.runtime.onInstalled.removeListener(handler);
}
