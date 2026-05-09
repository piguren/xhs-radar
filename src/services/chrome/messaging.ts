/**
 * chrome.runtime.sendMessage / onMessage 抽象封装。
 */

export function sendMessage<TReq = unknown, TRes = unknown>(msg: TReq): Promise<TRes> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(msg, (response: TRes) => {
      const err = chrome.runtime.lastError;
      if (err) {
        reject(new Error(err.message ?? 'sendMessage failed'));
        return;
      }
      resolve(response);
    });
  });
}

export type MessageHandler = (
  msg: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => boolean | undefined;

export function onMessage(handler: MessageHandler): () => void {
  chrome.runtime.onMessage.addListener(handler);
  return () => chrome.runtime.onMessage.removeListener(handler);
}
