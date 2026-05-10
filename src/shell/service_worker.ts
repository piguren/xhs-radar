import { handleStartScrape } from '@/services/orchestrator/handle_start_scrape';
import { handleContentScriptFetch } from '@/services/xhs/content_script_fetch_relay';

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
  switch (msg?.kind) {
    case 'PING':
      sendResponse({ pong: true });
      return false;

    case 'NOTES_CAPTURED': {
      const entry: DiagEntry = { ts: Date.now(), endpoint: msg.endpoint, payload: msg.payload };
      console.log('[xhs-radar][DIAG] NOTES_CAPTURED', entry.endpoint, msg.payload);
      chrome.storage.local.get([DIAG_KEY], (items) => {
        const list = (items[DIAG_KEY] as DiagEntry[] | undefined) ?? [];
        const updated = [entry, ...list].slice(0, 5);
        chrome.storage.local.set({ [DIAG_KEY]: updated });
      });
      return false;
    }

    case 'DIAG_BEGIN':
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

    case 'START_SCRAPE':
      handleStartScrape(msg.payload)
        .then(() => sendResponse({ success: true }))
        .catch((e: Error) => sendResponse({ success: false, error: e.message }));
      return true;

    case 'CONTENT_SCRIPT_FETCH':
      handleContentScriptFetch(msg)
        .then(sendResponse)
        .catch((e: Error) => sendResponse({ success: false, error: e.message }));
      return true;

    case 'CAPTCHA_RESOLVED':
      return false;

    default:
      return false;
  }
});

export {};
