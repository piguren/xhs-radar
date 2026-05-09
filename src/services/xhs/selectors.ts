/**
 * 小红书接口路径与选择器集中管理 — 热更入口。
 * 当小红书改版导致工具失效时，优先修改本文件并 commit 标 [selectors-update]。
 * 对应 docs/plans/xhs-radar-phase1.md T-060。
 */

export const XHS_SELECTORS = {
  VERSION: 'v1',
  HOST: 'edith.xiaohongshu.com',
  ORIGIN: 'https://www.xiaohongshu.com',
  SEARCH_PATH: '/api/sns/web/v1/search/notes',
  FEED_PATH: '/api/sns/web/v1/feed',
  USER_INFO_PATH: '/api/sns/web/v1/user/otherinfo',
  LOGIN_COOKIE_NAME: 'web_session',
  CAPTCHA_DOM_SELECTOR: '.captcha-container, [class*="captcha"]',
} as const;

export function isSearchUrl(url: string): boolean {
  return url.includes(XHS_SELECTORS.SEARCH_PATH);
}

export function isFeedUrl(url: string): boolean {
  return url.includes(XHS_SELECTORS.FEED_PATH);
}

export function isUserInfoUrl(url: string): boolean {
  return url.includes(XHS_SELECTORS.USER_INFO_PATH);
}
