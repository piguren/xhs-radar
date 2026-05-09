/**
 * 检测小红书风控信号。
 * 对应 docs/plans/xhs-radar-phase1.md T-066 + L3 §4.5。
 */

export function isCaptchaErrorCode(code: number): boolean {
  return code === 461;
}

export function isCaptchaResponse(resp: { code?: number; msg?: string }): boolean {
  if (resp.code !== undefined && isCaptchaErrorCode(resp.code)) return true;
  if (resp.msg && /验证|captcha/i.test(resp.msg)) return true;
  return false;
}
