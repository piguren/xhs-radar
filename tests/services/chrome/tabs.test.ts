import { describe, it, expect, vi, beforeEach } from 'vitest';
import { tabsCreate, tabsQuery, tabsSendMessage } from '@/services/chrome/tabs';

describe('services/chrome/tabs', () => {
  let createMock: ReturnType<typeof vi.fn>;
  let queryMock: ReturnType<typeof vi.fn>;
  let sendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    createMock = vi.fn();
    queryMock = vi.fn();
    sendMessageMock = vi.fn();
    (global as any).chrome = {
      tabs: { create: createMock, query: queryMock, sendMessage: sendMessageMock },
      runtime: { lastError: undefined },
    };
  });

  it('tabsCreate resolves to created tab', async () => {
    createMock.mockImplementation((_opts, cb) => cb({ id: 7, url: 'https://x.com' }));
    const r = await tabsCreate({ url: 'https://x.com' });
    expect(r.id).toBe(7);
  });

  it('tabsQuery returns matching tabs', async () => {
    queryMock.mockImplementation((_q, cb) => cb([{ id: 1 }, { id: 2 }]));
    const r = await tabsQuery({ active: true });
    expect(r).toHaveLength(2);
  });

  it('tabsSendMessage resolves with response', async () => {
    sendMessageMock.mockImplementation((_id, _msg, cb) => cb({ ok: true }));
    const r = await tabsSendMessage(1, { kind: 'PING' });
    expect(r).toEqual({ ok: true });
  });

  it('tabsSendMessage rejects on lastError', async () => {
    sendMessageMock.mockImplementation((_id, _msg, cb) => {
      (global as any).chrome.runtime.lastError = { message: 'tab gone' };
      cb();
    });
    await expect(tabsSendMessage(99, { kind: 'X' })).rejects.toThrow('tab gone');
  });
});
