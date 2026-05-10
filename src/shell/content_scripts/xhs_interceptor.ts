/**
 * Content script (ISOLATED world) — T-062
 * 1. 监听 SW 消息：BEGIN_INTERCEPT / END_INTERCEPT / SCROLL_ONCE / NAVIGATE_KEYWORD / CONTENT_SCRIPT_FETCH
 * 2. 注入 MAIN world 脚本（public/interceptor_main.js）
 * 3. 监听 window.postMessage 把 CAPTURED 数据转发给 SW
 * 4. 代理 dashboard/SW 发起的 fetch（携带 cookie）
 *
 * 对应 docs/prd/xhs-radar-l3.md §1.2 + docs/plans/xhs-radar-phase1.md T-062, T-067, T-068。
 */

interface CapturedMsg {
  __xhs_radar: 'CAPTURED';
  endpoint: 'search' | 'feed' | 'user_info';
  payload: unknown;
}

let captureBatchId: string | null = null;
let mainScriptInjected = false;

function injectMainWorldHook(onReady: () => void): void {
  if (mainScriptInjected) {
    onReady();
    return;
  }
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('interceptor_main.js');
  script.onload = () => {
    script.remove();
    onReady();
  };
  (document.head ?? document.documentElement).appendChild(script);
  mainScriptInjected = true;
}

async function relayFetch(
  body: unknown,
  endpoint: 'feed' | 'user_info',
  method: 'GET' | 'POST',
  query?: Record<string, string>,
): Promise<{ success: true; data: unknown } | { success: false; error: string }> {
  try {
    const baseUrls: Record<typeof endpoint, string> = {
      feed: 'https://edith.xiaohongshu.com/api/sns/web/v1/feed',
      user_info: 'https://edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo',
    };
    let url = baseUrls[endpoint];
    if (query && method === 'GET') {
      const qs = new URLSearchParams(query).toString();
      url = `${url}?${qs}`;
    }
    const init: RequestInit = {
      method,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
    };
    if (method === 'POST' && body !== undefined) {
      init.body = JSON.stringify(body);
    }
    const resp = await fetch(url, init);
    const data = await resp.json().catch(() => ({}));
    return { success: true, data };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'fetch failed' };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind === 'PING') {
    sendResponse({ pong: true });
    return false;
  }
  if (msg?.kind === 'BEGIN_INTERCEPT') {
    captureBatchId = msg.batchId;
    // 🟠 P1 #3: script 加载是异步的，必须 onload 后再 ack。
    // 已注入则同步 ack（onReady 立即调用 sendResponse → return false）；
    // 首次注入需等 onload → return true 保持 sendResponse 通道。
    if (mainScriptInjected) {
      injectMainWorldHook(() => sendResponse({ ok: true }));
      return false;
    }
    injectMainWorldHook(() => sendResponse({ ok: true }));
    return true;
  }
  if (msg?.kind === 'END_INTERCEPT') {
    captureBatchId = null;
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.kind === 'SCROLL_ONCE') {
    window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.kind === 'NAVIGATE_KEYWORD' && typeof msg.keyword === 'string') {
    window.location.href =
      'https://www.xiaohongshu.com/search?keyword=' + encodeURIComponent(msg.keyword);
    sendResponse({ ok: true });
    return false;
  }
  if (msg?.kind === 'CONTENT_SCRIPT_FETCH') {
    relayFetch(msg.body, msg.endpoint, msg.method ?? 'POST', msg.query).then(sendResponse);
    return true; // async response
  }
  return false;
});

window.addEventListener('message', (e: MessageEvent) => {
  if (e.source !== window) return;
  const data = e.data as CapturedMsg | undefined;
  if (!data || data.__xhs_radar !== 'CAPTURED') return;
  if (!captureBatchId) return;

  chrome.runtime.sendMessage({
    kind: 'NOTES_CAPTURED',
    batchId: captureBatchId,
    endpoint: data.endpoint,
    payload: data.payload,
  });
});

console.log('[xhs-radar] content script loaded on', window.location.href);

export {};
