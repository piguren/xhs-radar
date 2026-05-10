import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('service_worker message router (T-073)', () => {
  let listener: any;

  beforeEach(async () => {
    listener = undefined;
    (global as any).chrome = {
      runtime: {
        onInstalled: { addListener: vi.fn() },
        onMessage: {
          addListener: vi.fn((fn) => {
            listener = fn;
          }),
        },
        sendMessage: vi.fn(),
      },
      tabs: { create: vi.fn(), query: vi.fn(), sendMessage: vi.fn() },
      storage: { local: { get: vi.fn(), set: vi.fn() } },
      cookies: { get: vi.fn() },
    };
    vi.resetModules();
    await import('@/shell/service_worker');
  });

  it('responds to PING with pong', () => {
    const sendResponse = vi.fn();
    const ret = listener({ kind: 'PING' }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ pong: true });
    expect(ret).toBe(false);
  });

  it('routes START_SCRAPE to handleStartScrape (returns true for async)', () => {
    const sendResponse = vi.fn();
    const ret = listener(
      {
        kind: 'START_SCRAPE',
        payload: {
          batchId: 'b1',
          keywords: ['a'],
          timeWindow: { type: 'preset', days: 7 },
          thresholds: { ces: 100, likeRatio: 0.5 },
          candidatePoolMax: 200,
          targetBombCount: 20,
        },
      },
      {},
      sendResponse,
    );
    expect(ret).toBe(true);
  });

  it('routes CONTENT_SCRIPT_FETCH (returns true for async)', () => {
    const sendResponse = vi.fn();
    const ret = listener({ kind: 'CONTENT_SCRIPT_FETCH', endpoint: 'detail', noteId: 'n1' }, {}, sendResponse);
    expect(ret).toBe(true);
  });

  it('routes unknown kind without crashing', () => {
    const sendResponse = vi.fn();
    const ret = listener({ kind: 'UNKNOWN' }, {}, sendResponse);
    expect(ret).toBe(false);
  });
});
