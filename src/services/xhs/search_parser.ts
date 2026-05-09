/**
 * 解析小红书搜索响应为 NoteRecord[]。
 * 对应 docs/plans/xhs-radar-phase1.md T-064 + L3 §4.2 TC A1-T1~T9。
 */
import type { NoteRecord } from '@/types/note';
import type { XhsSearchNotesResponse } from './schemas/search';
import { parseCount } from '@/services/scoring/parse_count';

export class XhsAuthError extends Error {
  constructor(msg: string) {
    super(`XhsAuthError: ${msg}`);
    this.name = 'XhsAuthError';
  }
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
      time: 0,
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
        shareCount: parseCount(ii.share_count),
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
