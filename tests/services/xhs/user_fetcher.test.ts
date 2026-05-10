import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUserFans, __test_clearFanCache } from '@/services/xhs/user_fetcher';

describe('fetchUserFans (TC A3)', () => {
  let sendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessageMock = vi.fn();
    (global as any).chrome = { runtime: { sendMessage: sendMessageMock, lastError: undefined } };
    __test_clearFanCache();
  });

  // T1
  it('returns parsed fan count', async () => {
    sendMessageMock.mockImplementation((_msg, cb) =>
      cb({
        success: true,
        data: {
          code: 0,
          data: { interactions: [{ type: 'follows', count: '20' }, { type: 'fans', count: '8.6万' }] },
        },
      }),
    );
    expect(await fetchUserFans('u1')).toBe(86000);
  });

  // T2
  it('returns null when no fans interaction', async () => {
    sendMessageMock.mockImplementation((_msg, cb) =>
      cb({ success: true, data: { code: 0, data: { interactions: [] } } }),
    );
    expect(await fetchUserFans('u1')).toBeNull();
  });

  // T5
  it('returns null and skips request when userId empty', async () => {
    expect(await fetchUserFans('')).toBeNull();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  // T6
  it('caches result; second call hits cache', async () => {
    sendMessageMock.mockImplementation((_msg, cb) =>
      cb({ success: true, data: { code: 0, data: { interactions: [{ type: 'fans', count: '100' }] } } }),
    );
    expect(await fetchUserFans('u1')).toBe(100);
    expect(await fetchUserFans('u1')).toBe(100);
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
  });

  // failure path
  it('returns null when relay fails', async () => {
    sendMessageMock.mockImplementation((_msg, cb) => cb({ success: false, error: 'no tab' }));
    expect(await fetchUserFans('u1')).toBeNull();
  });

  // 🔴 P0 #2: failure must NOT be cached — transient errors should retry next call
  it('does not cache failure: retries on next call after relay failure', async () => {
    sendMessageMock
      .mockImplementationOnce((_msg, cb) => cb({ success: false, error: 'transient' }))
      .mockImplementationOnce((_msg, cb) =>
        cb({ success: true, data: { code: 0, data: { interactions: [{ type: 'fans', count: '500' }] } } }),
      );

    expect(await fetchUserFans('u1')).toBeNull();
    expect(await fetchUserFans('u1')).toBe(500);
    expect(sendMessageMock).toHaveBeenCalledTimes(2);
  });

  it('does not cache failure: retries when interactions list is missing fans entry', async () => {
    sendMessageMock
      .mockImplementationOnce((_msg, cb) =>
        cb({ success: true, data: { code: 0, data: { interactions: [] } } }),
      )
      .mockImplementationOnce((_msg, cb) =>
        cb({ success: true, data: { code: 0, data: { interactions: [{ type: 'fans', count: '42' }] } } }),
      );

    expect(await fetchUserFans('u1')).toBeNull();
    expect(await fetchUserFans('u1')).toBe(42);
    expect(sendMessageMock).toHaveBeenCalledTimes(2);
  });
});
