export interface ContentScriptFetchResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export async function handleContentScriptFetch(msg: unknown): Promise<ContentScriptFetchResult> {
  try {
    const tabs = await chrome.tabs.query({ url: '*://*.xiaohongshu.com/*' });
    const tab = tabs.find((t) => t.id != null) ?? tabs[0];
    if (!tab?.id) {
      return { success: false, error: 'no_xhs_tab' };
    }
    const reply = (await chrome.tabs.sendMessage(tab.id, msg)) as ContentScriptFetchResult | undefined;
    if (!reply) return { success: false, error: 'no_reply' };
    return reply;
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'relay_failed' };
  }
}
