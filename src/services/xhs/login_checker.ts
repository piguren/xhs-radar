/**
 * 检查小红书登录态（cookie 中是否有 web_session）。
 * 对应 docs/plans/xhs-radar-phase1.md T-065 + AC-010。
 */
import { XHS_SELECTORS } from './selectors';

export function isLoggedIn(): Promise<boolean> {
  return new Promise((resolve) => {
    chrome.cookies.get(
      { url: XHS_SELECTORS.ORIGIN, name: XHS_SELECTORS.LOGIN_COOKIE_NAME },
      (cookie) => {
        resolve(Boolean(cookie && cookie.value && cookie.value.length > 0));
      },
    );
  });
}
