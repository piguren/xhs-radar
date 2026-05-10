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

  // 🔴 P0 #2: 失败路径不缓存。临时错误（限流 / network 抖动 / cookie 刷新瞬间）
  // 缓存 null 会让该 userId 在整个 SW 生命周期内都拿不回 fans → likeToFansRatio
  // 永远为 null → isBomb 永远 false，本该上榜的笔记被静默踢掉。
  if (!resp.success || !resp.data || resp.data.code !== 0) {
    return null;
  }

  const interactions = resp.data?.data?.interactions ?? [];
  const fansEntry = interactions.find((i) => i.type === 'fans');
  if (!fansEntry) {
    return null;
  }

  const fans = parseCount(fansEntry.count);
  fanCache.set(userId, fans);
  return fans;
}

export const __test_clearFanCache = (): void => {
  fanCache.clear();
};
