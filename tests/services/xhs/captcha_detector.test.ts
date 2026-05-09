import { describe, it, expect } from 'vitest';
import { isCaptchaErrorCode, isCaptchaResponse } from '@/services/xhs/captcha_detector';

describe('captcha detector', () => {
  it('treats code 461 as captcha', () => {
    expect(isCaptchaErrorCode(461)).toBe(true);
    expect(isCaptchaErrorCode(0)).toBe(false);
    expect(isCaptchaErrorCode(-100)).toBe(false);
  });

  it('detects via response code', () => {
    expect(isCaptchaResponse({ code: 461 })).toBe(true);
    expect(isCaptchaResponse({ code: 0 })).toBe(false);
  });

  it('detects via 验证 keyword in msg', () => {
    expect(isCaptchaResponse({ code: -200, msg: '请完成验证' })).toBe(true);
  });

  it('detects via captcha keyword in msg', () => {
    expect(isCaptchaResponse({ code: -200, msg: 'captcha required' })).toBe(true);
  });
});
