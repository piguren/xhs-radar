import { describe, it, expect } from 'vitest';
import { XHS_SELECTORS, isSearchUrl, isFeedUrl, isUserInfoUrl } from '@/services/xhs/selectors';

describe('XHS_SELECTORS', () => {
  it('exposes path constants', () => {
    expect(XHS_SELECTORS.SEARCH_PATH).toBe('/api/sns/web/v1/search/notes');
    expect(XHS_SELECTORS.FEED_PATH).toBe('/api/sns/web/v1/feed');
    expect(XHS_SELECTORS.USER_INFO_PATH).toBe('/api/sns/web/v1/user/otherinfo');
    expect(XHS_SELECTORS.LOGIN_COOKIE_NAME).toBe('web_session');
  });

  it('isSearchUrl matches search endpoint', () => {
    expect(isSearchUrl('https://edith.xiaohongshu.com/api/sns/web/v1/search/notes')).toBe(true);
    expect(isSearchUrl('https://edith.xiaohongshu.com/api/sns/web/v1/feed')).toBe(false);
  });

  it('isFeedUrl matches feed endpoint', () => {
    expect(isFeedUrl('https://edith.xiaohongshu.com/api/sns/web/v1/feed')).toBe(true);
  });

  it('isUserInfoUrl matches with query string', () => {
    expect(
      isUserInfoUrl('https://edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo?target_user_id=abc'),
    ).toBe(true);
  });
});
