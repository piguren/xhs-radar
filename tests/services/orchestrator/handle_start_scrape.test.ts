import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { handleStartScrape } from '@/services/orchestrator/handle_start_scrape';

vi.mock('@/services/xhs/login_checker', () => ({ isLoggedIn: vi.fn().mockResolvedValue(true) }));
vi.mock('@/services/xhs/captcha_detector', () => ({ isCaptchaErrorCode: () => false }));
vi.mock('@/services/xhs/detail_fetcher', () => ({
  fetchNoteDetail: vi.fn().mockResolvedValue({ outcome: 'failed', reason: 'mocked' }),
}));
vi.mock('@/services/xhs/user_fetcher', () => ({ fetchUserFans: vi.fn().mockResolvedValue(null) }));

describe('handleStartScrape (T-074)', () => {
  let sendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    sendMessageMock = vi.fn();
    (global as any).chrome = {
      runtime: {
        sendMessage: sendMessageMock,
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      tabs: {
        create: vi.fn(async () => ({ id: 1 })),
        sendMessage: vi.fn(async (_tabId: number, m: any) => {
          if (m?.kind === 'PING') return { pong: true };
          return undefined;
        }),
      },
      storage: { local: { set: vi.fn(async () => undefined) } },
    };
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const basePayload = {
    batchId: 'b1',
    keywords: ['a'],
    timeWindow: { type: 'preset', days: 7 } as const,
    thresholds: { ces: 1, likeRatio: 0.001 },
    candidatePoolMax: 2,
    targetBombCount: 1,
  };

  it('emits validating → scraping → ... → complete on normal flow', async () => {
    const promise = handleStartScrape(basePayload);
    await vi.runAllTimersAsync();
    await promise;

    const statuses = sendMessageMock.mock.calls
      .map((c) => c[0])
      .filter((m) => m?.kind === 'SCRAPE_STATUS')
      .map((m) => m.status);

    expect(statuses[0]).toBe('validating');
    expect(statuses).toContain('scraping');
    expect(statuses[statuses.length - 1]).toBe('complete');
  });

  it('escalates to failed when isLoggedIn is false', async () => {
    const lc = await import('@/services/xhs/login_checker');
    (lc.isLoggedIn as any).mockResolvedValueOnce(false);

    const promise = handleStartScrape({ ...basePayload, batchId: 'b2' });
    await vi.runAllTimersAsync();
    await promise;

    const statuses = sendMessageMock.mock.calls
      .map((c) => c[0])
      .filter((m) => m?.kind === 'SCRAPE_STATUS')
      .map((m) => m.status);

    expect(statuses[statuses.length - 1]).toBe('failed');
  });

  it('escalates to failed when chrome.tabs.create returns no id', async () => {
    (global as any).chrome.tabs.create = vi.fn(async () => ({ id: undefined }));

    const promise = handleStartScrape({ ...basePayload, batchId: 'b3' });
    await vi.runAllTimersAsync();
    await promise;

    const statuses = sendMessageMock.mock.calls
      .map((c) => c[0])
      .filter((m) => m?.kind === 'SCRAPE_STATUS')
      .map((m) => m.status);

    expect(statuses[statuses.length - 1]).toBe('failed');
  });

  it('🔴 issue #1 fix: re-sends BEGIN_INTERCEPT after NAVIGATE_KEYWORD page reload', async () => {
    // 多关键词，pool 永远为空 → 每个 keyword 在 stall 3 次后切到下一个
    // Verify: BEGIN_INTERCEPT 被发送 ≥ 2 次（首次 + NAVIGATE 后重发）
    const promise = handleStartScrape({
      ...basePayload,
      batchId: 'b4',
      keywords: ['kw1', 'kw2'],
    });
    await vi.runAllTimersAsync();
    await promise;

    const beginCalls = (global as any).chrome.tabs.sendMessage.mock.calls.filter(
      (c: any) => c[1]?.kind === 'BEGIN_INTERCEPT',
    );
    expect(beginCalls.length).toBeGreaterThanOrEqual(2);
  });

  it('🟠 P1.2: waits for content-script PING ack after NAVIGATE_KEYWORD before re-arming', async () => {
    // 模拟：导航后第 1、2 次 PING 失败，第 3 次成功；只有 PING ack 后才发 BEGIN_INTERCEPT
    const sendOrder: string[] = [];
    let pingCount = 0;

    (global as any).chrome.tabs.sendMessage = vi.fn(async (_tabId: number, m: any) => {
      sendOrder.push(m.kind);
      if (m.kind === 'PING') {
        pingCount++;
        if (pingCount < 3) throw new Error('Receiving end does not exist');
        return { pong: true };
      }
      return undefined;
    });

    const promise = handleStartScrape({
      ...basePayload,
      batchId: 'b_ping',
      keywords: ['kw1', 'kw2'],
    });
    await vi.runAllTimersAsync();
    await promise;

    // 在 NAVIGATE_KEYWORD 之后、第二次 BEGIN_INTERCEPT 之前应有至少 1 次 PING
    const navIdx = sendOrder.findIndex((k) => k === 'NAVIGATE_KEYWORD');
    const beginAfterNav = sendOrder.slice(navIdx + 1).indexOf('BEGIN_INTERCEPT');
    expect(navIdx).toBeGreaterThanOrEqual(0);
    expect(beginAfterNav).toBeGreaterThanOrEqual(0);
    const between = sendOrder.slice(navIdx + 1, navIdx + 1 + beginAfterNav);
    expect(between).toContain('PING');
  });

  it('🔴 P0 #1: waits for content-script PING ack BEFORE first BEGIN_INTERCEPT (initial tab create)', async () => {
    // 模拟新 tab 创建后 content script 还没就绪：第 1、2 次 PING 失败，第 3 次成功
    const sendOrder: string[] = [];
    let pingCount = 0;

    (global as any).chrome.tabs.sendMessage = vi.fn(async (_tabId: number, m: any) => {
      sendOrder.push(m.kind);
      if (m.kind === 'PING') {
        pingCount++;
        if (pingCount < 3) throw new Error('Receiving end does not exist');
        return { pong: true };
      }
      return undefined;
    });

    const promise = handleStartScrape({ ...basePayload, batchId: 'b_first_ping' });
    await vi.runAllTimersAsync();
    await promise;

    // 第一次 BEGIN_INTERCEPT 之前必须有至少一次 PING（证明等了 CS 就绪）
    const firstBegin = sendOrder.indexOf('BEGIN_INTERCEPT');
    expect(firstBegin).toBeGreaterThan(0);
    const beforeFirstBegin = sendOrder.slice(0, firstBegin);
    expect(beforeFirstBegin).toContain('PING');
  });

  it('🔴 P0 #1: fails fast when content-script PING never acks after tab create', async () => {
    // 模拟 PING 永远超时 → 应直接 fail，而不是闷头发 BEGIN_INTERCEPT 又被 reject
    (global as any).chrome.tabs.sendMessage = vi.fn(async (_tabId: number, m: any) => {
      if (m.kind === 'PING') throw new Error('Receiving end does not exist');
      return undefined;
    });

    const promise = handleStartScrape({ ...basePayload, batchId: 'b_ping_timeout' });
    await vi.runAllTimersAsync();
    await promise;

    const statuses = sendMessageMock.mock.calls
      .map((c) => c[0])
      .filter((m) => m?.kind === 'SCRAPE_STATUS')
      .map((m) => m.status);
    expect(statuses[statuses.length - 1]).toBe('failed');
  });

  it('🟠 P1.1: emits failed when chrome.tabs.sendMessage rejects mid-flow', async () => {
    (global as any).chrome.tabs.sendMessage = vi
      .fn()
      .mockRejectedValueOnce(new Error('Receiving end does not exist'));

    const promise = handleStartScrape({ ...basePayload, batchId: 'b_err' });
    await vi.runAllTimersAsync();
    await promise;

    const statuses = sendMessageMock.mock.calls
      .map((c) => c[0])
      .filter((m) => m?.kind === 'SCRAPE_STATUS')
      .map((m) => m.status);

    expect(statuses[statuses.length - 1]).toBe('failed');
  });

  it('persists batch record to chrome.storage.local on complete', async () => {
    const promise = handleStartScrape({ ...basePayload, batchId: 'b5' });
    await vi.runAllTimersAsync();
    await promise;

    const setMock = (global as any).chrome.storage.local.set as ReturnType<typeof vi.fn>;
    expect(setMock).toHaveBeenCalled();
    const lastCall = setMock.mock.calls[setMock.mock.calls.length - 1][0];
    expect(lastCall).toHaveProperty('batch_b5');
    expect(lastCall.batch_b5.status).toBe('complete');
  });
});
