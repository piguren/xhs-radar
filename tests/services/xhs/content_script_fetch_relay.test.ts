import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleContentScriptFetch } from '@/services/xhs/content_script_fetch_relay';

describe('handleContentScriptFetch', () => {
  beforeEach(() => {
    (global as any).chrome = {
      tabs: {
        query: vi.fn(),
        sendMessage: vi.fn(),
      },
    };
  });

  it('returns error when no xhs tab is open', async () => {
    (global as any).chrome.tabs.query = vi.fn(async () => []);
    const r = await handleContentScriptFetch({ kind: 'CONTENT_SCRIPT_FETCH', endpoint: 'feed', body: {} });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/no_xhs_tab/);
  });

  it('relays to active xhs tab and returns content script response', async () => {
    (global as any).chrome.tabs.query = vi.fn(async () => [
      { id: 42, url: 'https://www.xiaohongshu.com/explore' },
    ]);
    (global as any).chrome.tabs.sendMessage = vi.fn(async () => ({
      success: true,
      data: { code: 0, items: [] },
    }));
    const r = await handleContentScriptFetch({ kind: 'CONTENT_SCRIPT_FETCH', endpoint: 'feed', body: { x: 1 } });
    expect(r.success).toBe(true);
    expect((global as any).chrome.tabs.sendMessage).toHaveBeenCalledWith(42, expect.objectContaining({ kind: 'CONTENT_SCRIPT_FETCH' }));
  });

  it('returns error when content script throws', async () => {
    (global as any).chrome.tabs.query = vi.fn(async () => [{ id: 1, url: 'https://www.xiaohongshu.com/' }]);
    (global as any).chrome.tabs.sendMessage = vi.fn(async () => {
      throw new Error('disconnected');
    });
    const r = await handleContentScriptFetch({ kind: 'CONTENT_SCRIPT_FETCH', endpoint: 'feed', body: {} });
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/disconnected/);
  });
});
