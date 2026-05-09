// xhs-radar Content Script（占位 — Phase 1.6 T-062 会补完整注入与转发）
// 对应 docs/prd/xhs-radar-l3.md §1.2 + docs/plans/xhs-radar-phase1.md T-062

console.log('[xhs-radar] content script loaded on', window.location.href);

// TODO [PHASE 1.6 T-062]：
// - 监听 chrome.runtime.onMessage 接收 BEGIN_INTERCEPT / SCROLL_ONCE
// - 注入 MAIN world interceptor_main.js
// - 监听 window.postMessage 把捕获的响应转给 service worker

export {};
