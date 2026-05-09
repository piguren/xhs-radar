// xhs-radar Service Worker
// 当前阶段：Phase 1.6 完成，Phase 1.7 待开发
// 目前只做最小路由 + T-069 诊断日志

const DIAG_KEY = '__xhs_radar_diag';

interface DiagEntry {
  ts: number;
  endpoint: 'search' | 'feed' | 'user_info';
  payload: unknown;
}

chrome.runtime.onInstalled.addListener(() => {
  console.log('[xhs-radar] service worker installed');
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind === 'PING') {
    sendResponse({ pong: true });
    return false;
  }

  // T-069 诊断：把 NOTES_CAPTURED 日志打到 SW console + 存最近 5 条到 storage 供 popup 读取
  if (msg?.kind === 'NOTES_CAPTURED') {
    const entry: DiagEntry = {
      ts: Date.now(),
      endpoint: msg.endpoint,
      payload: msg.payload,
    };
    console.log('[xhs-radar][DIAG] NOTES_CAPTURED', entry.endpoint, msg.payload);

    chrome.storage.local.get([DIAG_KEY], (items) => {
      const list = (items[DIAG_KEY] as DiagEntry[] | undefined) ?? [];
      const updated = [entry, ...list].slice(0, 5);
      chrome.storage.local.set({ [DIAG_KEY]: updated });
    });
    return false;
  }

  // TODO [PHASE 1.7] START_SCRAPE / CONTENT_SCRIPT_FETCH / CAPTCHA_RESOLVED
  return false;
});

// 给 popup 用：在当前活动的小红书 Tab 注入诊断捕获。
// popup 用 chrome.runtime.sendMessage({kind:'DIAG_BEGIN'}) 触发。
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind !== 'DIAG_BEGIN') return false;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];
    if (!tab?.id || !tab.url || !tab.url.includes('xiaohongshu.com')) {
      sendResponse({ ok: false, reason: 'not_on_xhs' });
      return;
    }
    chrome.tabs.sendMessage(tab.id, { kind: 'BEGIN_INTERCEPT', batchId: 'diag_t069' }, () => {
      sendResponse({ ok: true, tabId: tab.id });
    });
  });
  return true;
});

export {};
