/**
 * DeepSeek client（OpenAI-兼容协议）。
 * Phase 1.5 仅实现 testKey；完整 chat/重试/JSON schema 校验在 Phase 1.9。
 */

const DEEPSEEK_BASE_URL = 'https://api.deepseek.com/v1';

export type TestKeyResult =
  | { ok: true }
  | { ok: false; reason: 'unauthorized' | 'rate_limited' | 'network' | 'unknown'; message: string };

/**
 * 用最小 chat 请求验证 key 是否有效。响应内容不重要，只看是否 200。
 */
export async function testKey(apiKey: string): Promise<TestKeyResult> {
  if (!apiKey.trim()) {
    return { ok: false, reason: 'unknown', message: 'Empty key' };
  }
  try {
    const resp = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: 'hi' }],
        max_tokens: 1,
        temperature: 0,
      }),
    });
    if (resp.ok) return { ok: true };
    if (resp.status === 401 || resp.status === 403) {
      return { ok: false, reason: 'unauthorized', message: `HTTP ${resp.status}` };
    }
    if (resp.status === 429) {
      return { ok: false, reason: 'rate_limited', message: `HTTP 429` };
    }
    return { ok: false, reason: 'unknown', message: `HTTP ${resp.status}` };
  } catch (e) {
    return {
      ok: false,
      reason: 'network',
      message: e instanceof Error ? e.message : 'fetch failed',
    };
  }
}
