import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isLoggedIn } from '@/services/xhs/login_checker';

describe('isLoggedIn', () => {
  let cookiesGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cookiesGet = vi.fn();
    (global as any).chrome = { cookies: { get: cookiesGet } };
  });

  it('returns true when web_session cookie has value', async () => {
    cookiesGet.mockImplementation((_, cb) => cb({ name: 'web_session', value: 'abc', domain: '.xiaohongshu.com' }));
    expect(await isLoggedIn()).toBe(true);
  });

  it('returns false when cookie is null', async () => {
    cookiesGet.mockImplementation((_, cb) => cb(null));
    expect(await isLoggedIn()).toBe(false);
  });

  it('returns false when cookie value is empty string', async () => {
    cookiesGet.mockImplementation((_, cb) => cb({ name: 'web_session', value: '', domain: '.xiaohongshu.com' }));
    expect(await isLoggedIn()).toBe(false);
  });
});
