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
        sendMessage: vi.fn(async () => undefined),
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
