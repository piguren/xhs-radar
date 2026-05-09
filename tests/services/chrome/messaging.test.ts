import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendMessage, onMessage } from '@/services/chrome/messaging';

describe('services/chrome/messaging', () => {
  let sendMock: ReturnType<typeof vi.fn>;
  let addListenerMock: ReturnType<typeof vi.fn>;
  let removeListenerMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMock = vi.fn();
    addListenerMock = vi.fn();
    removeListenerMock = vi.fn();
    (global as any).chrome = {
      runtime: {
        sendMessage: sendMock,
        onMessage: { addListener: addListenerMock, removeListener: removeListenerMock },
        lastError: undefined,
      },
    };
  });

  it('sendMessage resolves with the response', async () => {
    sendMock.mockImplementation((_msg, cb) => cb({ ok: true }));
    const r = await sendMessage({ kind: 'PING' });
    expect(r).toEqual({ ok: true });
  });

  it('sendMessage rejects when chrome.runtime.lastError is set', async () => {
    sendMock.mockImplementation((_msg, cb) => {
      (global as any).chrome.runtime.lastError = { message: 'no listener' };
      cb();
    });
    await expect(sendMessage({ kind: 'PING' })).rejects.toThrow('no listener');
  });

  it('onMessage registers listener and returns unsubscribe', () => {
    const handler = vi.fn();
    const off = onMessage(handler);
    expect(addListenerMock).toHaveBeenCalledWith(handler);
    off();
    expect(removeListenerMock).toHaveBeenCalledWith(handler);
  });
});
