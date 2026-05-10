/**
 * 解析小红书搜索响应为 NoteRecord[]。
 * 对应 docs/plans/xhs-radar-phase1.md T-064 + L3 §4.2 TC A1-T1~T9。
 */
import type { NoteRecord } from '@/types/note';
import type { XhsCornerTag, XhsSearchNotesResponse } from './schemas/search';
import { parseCount } from '@/services/scoring/parse_count';

export class XhsAuthError extends Error {
  constructor(msg: string) {
    super(`XhsAuthError: ${msg}`);
    this.name = 'XhsAuthError';
  }
}

const DAY_MS = 86_400_000;

export function parseCornerPublishTime(tags: XhsCornerTag[] | undefined, now: number = Date.now()): number {
  if (!tags) return 0;
  const tag = tags.find((t) => t.type === 'publish_time');
  if (!tag) return 0;
  const text = tag.text.trim();

  const dayAgo = /^(\d+)\s*天前$/.exec(text);
  if (dayAgo) return now - Number(dayAgo[1]) * DAY_MS;

  const hourAgo = /^(\d+)\s*小时前$/.exec(text);
  if (hourAgo) return now - Number(hourAgo[1]) * 3_600_000;

  if (text === '昨天') return now - DAY_MS;
  if (text === '今天' || text === '刚刚') return now;

  const fullDate = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(text);
  if (fullDate) {
    const t = Date.UTC(Number(fullDate[1]), Number(fullDate[2]) - 1, Number(fullDate[3]));
    return Number.isFinite(t) ? t : 0;
  }

  const mmdd = /^(\d{1,2})-(\d{1,2})$/.exec(text);
  if (mmdd) {
    const today = new Date(now);
    const year = today.getUTCFullYear();
    const cand = Date.UTC(year, Number(mmdd[1]) - 1, Number(mmdd[2]));
    return cand > now + 30 * DAY_MS ? Date.UTC(year - 1, Number(mmdd[1]) - 1, Number(mmdd[2])) : cand;
  }

  return 0;
}

export function parseSearchResponse(resp: XhsSearchNotesResponse): NoteRecord[] {
  if (resp.code === -100) {
    throw new XhsAuthError('未登录或 cookie 失效');
  }
  if (resp.code !== 0) {
    return [];
  }

  const items = resp.data?.items ?? [];
  const out: NoteRecord[] = [];

  for (const item of items) {
    if (item.model_type !== 'note') continue;
    const card = item.note_card;
    if (!card) continue;
    if (!card.user) continue;
    if (!item.xsec_token) continue;

    const ii = card.interact_info;

    out.push({
      noteId: item.id,
      xsecToken: item.xsec_token,
      modelType: 'note',
      title: card.display_title ?? '',
      time: parseCornerPublishTime(card.corner_tag_info),
      lastUpdateTime: 0,
      tagList: [],
      user: {
        userId: card.user.user_id,
        nickname: card.user.nickname ?? card.user.nick_name ?? '',
        avatar: card.user.avatar ?? '',
        fans: null,
      },
      interactInfo: {
        likedCount: parseCount(ii.liked_count),
        collectedCount: parseCount(ii.collected_count),
        commentCount: parseCount(ii.comment_count),
        shareCount: parseCount(ii.shared_count),
      },
      desc: null,
      detailFetchedAt: null,
      cesScore: 0,
      likeToFansRatio: null,
      daysSincePublish: 0,
      timeDecayFactor: 1,
      weightedScore: 0,
      isBomb: false,
      bombReason: 'not_bomb',
      clusterLabel: null,
      detailFetchFailed: false,
      fanFetchFailed: false,
      isDeleted: false,
    });
  }

  return out;
}
