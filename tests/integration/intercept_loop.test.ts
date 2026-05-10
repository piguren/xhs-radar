/**
 * Integration test: 模拟"MAIN world → content script → SW"消息链
 *
 * 不能验证：MAIN world 是否真劫持了 fetch/XHR（必须真实浏览器）
 * 可以验证：CAPTURED postMessage → content script 转发 → SW 收到 NOTES_CAPTURED
 *           captureBatchId guard / BEGIN_INTERCEPT 注入 / END_INTERCEPT 关闭
 *
 * 配套手动验证 runbook：见 docs/plans/xhs-radar-phase1.md T-069 流程。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseSearchResponse } from '@/services/xhs/search_parser';

const FIXTURE_PATH = join(__dirname, '..', '..', 'test-fixtures', 'real-search-response-2026-05-10.json');

interface ChromeMessageHandler {
  (msg: any, sender: any, sendResponse: any): boolean | undefined;
}

describe('intercept loop contract (T-073 verification before T-074)', () => {
  let cs: { onMessage: ChromeMessageHandler[] } = { onMessage: [] };
  let sw: { onMessage: ChromeMessageHandler[] } = { onMessage: [] };
  let swSendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    cs = { onMessage: [] };
    sw = { onMessage: [] };
    swSendMessageMock = vi.fn((msg) => {
      // simulate chrome.runtime.sendMessage from content script reaching SW
      for (const h of sw.onMessage) h(msg, {}, vi.fn());
    });

    (global as any).chrome = {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        onInstalled: { addListener: vi.fn() },
        onMessage: {
          addListener: vi.fn((h: ChromeMessageHandler) => {
            // both content script and SW use chrome.runtime.onMessage; we route
            // by which module is currently being imported. We use call order:
            // first import = SW, second import = content script.
            if (sw.onMessage.length === 0) sw.onMessage.push(h);
            else cs.onMessage.push(h);
          }),
        },
        sendMessage: swSendMessageMock,
      },
      tabs: { query: vi.fn(), sendMessage: vi.fn(), create: vi.fn() },
      storage: {
        local: {
          get: vi.fn((_keys, cb) => cb({})),
          set: vi.fn(),
        },
      },
      cookies: { get: vi.fn() },
    };

    vi.resetModules();
    await import('@/shell/service_worker');
    await import('@/shell/content_scripts/xhs_interceptor');
  });

  function dispatchCaptured(endpoint: 'search' | 'feed' | 'user_info', payload: unknown) {
    const evt = new MessageEvent('message', {
      data: { __xhs_radar: 'CAPTURED', endpoint, payload },
      source: window as any,
    });
    window.dispatchEvent(evt);
  }

  it('full flow: drop-before-begin → capture-after-begin → drop-after-end', () => {
    // Phase 1: before BEGIN_INTERCEPT — should drop
    dispatchCaptured('search', { code: 0, dropMe: true });
    expect(
      swSendMessageMock.mock.calls.filter((c) => c[0]?.kind === 'NOTES_CAPTURED'),
    ).toHaveLength(0);

    // Phase 2: BEGIN_INTERCEPT then dispatch real fixture
    const sendResponse = vi.fn();
    cs.onMessage[0]({ kind: 'BEGIN_INTERCEPT', batchId: 'btch_test' }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ ok: true });

    const fixture = JSON.parse(readFileSync(FIXTURE_PATH, 'utf-8'));
    dispatchCaptured('search', fixture);

    const captured = swSendMessageMock.mock.calls.find((c) => c[0]?.kind === 'NOTES_CAPTURED');
    expect(captured).toBeDefined();
    expect(captured![0]).toMatchObject({
      kind: 'NOTES_CAPTURED',
      batchId: 'btch_test',
      endpoint: 'search',
    });
    const notes = parseSearchResponse(captured![0].payload);
    expect(notes.length).toBeGreaterThan(0);
    expect(notes[0].interactInfo.shareCount).toBeGreaterThanOrEqual(0);

    // Phase 3: END_INTERCEPT, no further capture
    cs.onMessage[0]({ kind: 'END_INTERCEPT' }, {}, vi.fn());
    swSendMessageMock.mockClear();
    dispatchCaptured('feed', { afterEnd: true });
    expect(
      swSendMessageMock.mock.calls.filter((c) => c[0]?.kind === 'NOTES_CAPTURED'),
    ).toHaveLength(0);
  });

  it('🔴 known limitation: NAVIGATE_KEYWORD reload would reset batchId in real browser', () => {
    // This test does NOT pass NAVIGATE_KEYWORD logic; it documents the issue.
    // In real Chrome: chrome.runtime.sendMessage NAVIGATE_KEYWORD → content script does
    // window.location.href = ... → page reloads → content script reloads → captureBatchId = null
    // → all subsequent CAPTURED messages dropped until SW re-sends BEGIN_INTERCEPT.
    expect(true).toBe(true); // marker test
  });
});
