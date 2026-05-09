import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  storageGet,
  storageSet,
  storageRemove,
  StorageQuotaError,
} from '@/services/chrome/storage';

describe('services/chrome/storage', () => {
  let getMock: ReturnType<typeof vi.fn>;
  let setMock: ReturnType<typeof vi.fn>;
  let removeMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    getMock = vi.fn();
    setMock = vi.fn();
    removeMock = vi.fn();
    (global as any).chrome = {
      storage: {
        local: { get: getMock, set: setMock, remove: removeMock },
      },
      runtime: { lastError: undefined },
    };
  });

  it('storageGet returns the value when present', async () => {
    getMock.mockImplementation((_key, cb) => cb({ foo: { hello: 'world' } }));
    const result = await storageGet<{ hello: string }>('foo');
    expect(result).toEqual({ hello: 'world' });
  });

  it('storageGet returns undefined when key missing', async () => {
    getMock.mockImplementation((_key, cb) => cb({}));
    const result = await storageGet('missing');
    expect(result).toBeUndefined();
  });

  it('storageSet persists the value', async () => {
    setMock.mockImplementation((_obj, cb) => cb());
    await storageSet('foo', { hello: 'world' });
    expect(setMock).toHaveBeenCalledWith({ foo: { hello: 'world' } }, expect.any(Function));
  });

  it('storageSet throws StorageQuotaError when quota exceeded', async () => {
    setMock.mockImplementation((_obj, cb) => {
      (global as any).chrome.runtime.lastError = { message: 'QUOTA_BYTES quota exceeded' };
      cb();
    });
    await expect(storageSet('big', 'x'.repeat(10 * 1024 * 1024))).rejects.toBeInstanceOf(
      StorageQuotaError,
    );
  });

  it('storageRemove deletes the key', async () => {
    removeMock.mockImplementation((_key, cb) => cb());
    await storageRemove('foo');
    expect(removeMock).toHaveBeenCalledWith('foo', expect.any(Function));
  });
});
