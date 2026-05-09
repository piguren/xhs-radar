// xhs-radar Service Worker（占位 — Phase 1.7 会补完整消息路由）
// 对应 docs/prd/xhs-radar-l3.md §1.2 + docs/plans/xhs-radar-phase1.md T-073

chrome.runtime.onInstalled.addListener(() => {
  console.log('[xhs-radar] service worker installed');
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg?.kind === 'PING') {
    sendResponse({ pong: true });
    return false;
  }
  // TODO [PHASE 1.7] START_SCRAPE / NOTES_CAPTURED / CONTENT_SCRIPT_FETCH / CAPTCHA_RESOLVED
  return false;
});

export {};
