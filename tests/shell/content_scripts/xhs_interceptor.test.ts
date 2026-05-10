/**
 * Unit test: BEGIN_INTERCEPT 必须等 MAIN world script.onload 之后再 sendResponse。
 *
 * P1 #3 — 之前 handler 同步 sendResponse({ok:true})，但 script 加载是异步的。
 * orchestrator 仅靠 200ms sleep 兜底，慢机器/扩展冷启动会漏掉首批被劫持的 XHR。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

interface ChromeMessageHandler {
  (msg: any, sender: any, sendResponse: any): boolean | undefined;
}

describe('xhs_interceptor BEGIN_INTERCEPT async handshake (P1 #3)', () => {
  let cs: { onMessage: ChromeMessageHandler[] };
  let fakeScript: { src: string; onload: (() => void) | null; remove: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    cs = { onMessage: [] };
    fakeScript = { src: '', onload: null, remove: vi.fn() };

    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'script') return fakeScript as unknown as HTMLScriptElement;
      return {} as HTMLElement;
    });
    vi.spyOn(document.head, 'appendChild').mockImplementation(((node: Node) => node) as any);

    (global as any).chrome = {
      runtime: {
        getURL: (path: string) => `chrome-extension://test/${path}`,
        onMessage: {
          addListener: vi.fn((h: ChromeMessageHandler) => cs.onMessage.push(h)),
        },
        sendMessage: vi.fn(),
      },
    };

    vi.resetModules();
    await import('@/shell/content_scripts/xhs_interceptor');
  });

  it('returns true (async) and defers sendResponse until script.onload fires', () => {
    const sendResponse = vi.fn();
    const ret = cs.onMessage[0](
      { kind: 'BEGIN_INTERCEPT', batchId: 'b1' },
      {},
      sendResponse,
    );

    // handler 必须 return true 让 chrome 保持 sendResponse 通道打开
    expect(ret).toBe(true);
    // onload 触发前，绝不能 sendResponse
    expect(sendResponse).not.toHaveBeenCalled();
    expect(typeof fakeScript.onload).toBe('function');

    // 模拟 MAIN world script 加载完成
    fakeScript.onload!();

    expect(sendResponse).toHaveBeenCalledWith({ ok: true });
    expect(fakeScript.remove).toHaveBeenCalled();
  });

  it('second BEGIN_INTERCEPT (already injected) responds synchronously without re-injecting', () => {
    // 第一次注入
    const sr1 = vi.fn();
    cs.onMessage[0]({ kind: 'BEGIN_INTERCEPT', batchId: 'b1' }, {}, sr1);
    fakeScript.onload!();
    expect(sr1).toHaveBeenCalledWith({ ok: true });

    const createSpy = vi.spyOn(document, 'createElement');
    createSpy.mockClear();

    // 第二次：脚本已注入，应当立即同步 ack，不再创建 script 元素
    const sr2 = vi.fn();
    const ret = cs.onMessage[0]({ kind: 'BEGIN_INTERCEPT', batchId: 'b2' }, {}, sr2);

    expect(sr2).toHaveBeenCalledWith({ ok: true });
    expect(ret).toBe(false);
    expect(createSpy).not.toHaveBeenCalledWith('script');
  });
});
