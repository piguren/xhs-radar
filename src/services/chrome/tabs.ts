/**
 * chrome.tabs 抽象封装。
 */

export function tabsCreate(opts: chrome.tabs.CreateProperties): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    chrome.tabs.create(opts, (tab) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message ?? 'tabs.create failed'));
        return;
      }
      resolve(tab);
    });
  });
}

export function tabsQuery(filter: chrome.tabs.QueryInfo): Promise<chrome.tabs.Tab[]> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query(filter, (tabs) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message ?? 'tabs.query failed'));
        return;
      }
      resolve(tabs);
    });
  });
}

export function tabsSendMessage<TReq = unknown, TRes = unknown>(
  tabId: number,
  msg: TReq,
): Promise<TRes> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, msg, (response: TRes) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message ?? 'tabs.sendMessage failed'));
        return;
      }
      resolve(response);
    });
  });
}
