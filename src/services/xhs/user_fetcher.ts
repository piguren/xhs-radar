/**
 * 博主主页粉丝数获取。per-user 缓存避免重复请求。
 * 对应 docs/plans/xhs-radar-phase1.md T-068 + L3 §4.4 TC A3。
 */
import { sendMessage } from '@/services/chrome/messaging';
import { parseCount } from '@/services/scoring/parse_count';

interface RelayResponse {
  success: boolean;
  data?: {
    code: number;
    data?: { interactions?: Array<{ type: string; count: string }> };
  };
  error?: string;
}

const fanCache = new Map<string, number | null>();

export async function fetchUserFans(userId: string): Promise<number | null> {
  if (!userId) return null;
  if (fanCache.has(userId)) return fanCache.get(userId)!;

  const resp = await sendMessage<unknown, RelayResponse>({
    kind: 'CONTENT_SCRIPT_FETCH',
    method: 'GET',
    endpoint: 'user_info',
    query: { target_user_id: userId },
  });

  if (!resp.success || !resp.data || resp.data.code !== 0) {
    fanCache.set(userId, null);
    return null;
  }

  const interactions = resp.data?.data?.interactions ?? [];
  const fansEntry = interactions.find((i) => i.type === 'fans');
  if (!fansEntry) {
    fanCache.set(userId, null);
    return null;
  }

  const fans = parseCount(fansEntry.count);
  fanCache.set(userId, fans);
  return fans;
}

export const __test_clearFanCache = (): void => {
  fanCache.clear();
};
