import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getURL, getId, onInstalled } from '@/services/chrome/runtime';

describe('services/chrome/runtime', () => {
  let getURLMock: ReturnType<typeof vi.fn>;
  let onInstalledAdd: ReturnType<typeof vi.fn>;
  let onInstalledRemove: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getURLMock = vi.fn((p: string) => `chrome-extension://abc/${p}`);
    onInstalledAdd = vi.fn();
    onInstalledRemove = vi.fn();
    (global as any).chrome = {
      runtime: {
        id: 'abc123',
        getURL: getURLMock,
        onInstalled: { addListener: onInstalledAdd, removeListener: onInstalledRemove },
      },
    };
  });

  it('getURL prefixes with extension scheme', () => {
    expect(getURL('public/dashboard.html')).toBe('chrome-extension://abc/public/dashboard.html');
  });

  it('getId returns extension id', () => {
    expect(getId()).toBe('abc123');
  });

  it('onInstalled registers and unsubscribes', () => {
    const handler = vi.fn();
    const off = onInstalled(handler);
    expect(onInstalledAdd).toHaveBeenCalledWith(handler);
    off();
    expect(onInstalledRemove).toHaveBeenCalledWith(handler);
  });
});
