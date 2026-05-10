/**
 * 笔记详情获取（仅对爆款调用，含错误码分类）。
 * 通过 chrome.runtime.sendMessage 发到 SW，SW 转发到 content script，
 * 由 content script 在小红书源下 fetch（cookie 自动带）。
 *
 * 对应 docs/plans/xhs-radar-phase1.md T-067 + L3 §4.3 TC A2-T1~T10。
 */
import { isCaptchaErrorCode } from './captcha_detector';
import { sendMessage } from '@/services/chrome/messaging';

export type DetailFetchOutcome =
  | { outcome: 'success'; desc: string; time: number; tagList: Array<{ type: string; name: string; id?: string }> }
  | { outcome: 'deleted' }
  | { outcome: 'captcha' }
  | { outcome: 'invalid_args' }
  | { outcome: 'failed'; reason: string };

interface NoteTag {
  type: string;
  name: string;
  id?: string;
}

interface FeedNoteCard {
  desc?: string;
  time?: number;
  tag_list?: NoteTag[];
}

interface RelayResponse {
  success: boolean;
  data?: {
    code: number;
    data?: { items: Array<{ note_card?: FeedNoteCard }> };
    msg?: string;
  };
  error?: string;
}

export async function fetchNoteDetail(
  noteId: string,
  xsecToken: string,
): Promise<DetailFetchOutcome> {
  if (!xsecToken || !noteId) {
    return { outcome: 'invalid_args' };
  }

  const body = {
    source_note_id: noteId,
    image_formats: ['jpg', 'webp', 'avif'],
    extra: { need_body_topic: '1' },
    xsec_source: 'pc_search',
    xsec_token: xsecToken,
  };

  const resp = await sendMessage<unknown, RelayResponse>({
    kind: 'CONTENT_SCRIPT_FETCH',
    method: 'POST',
    endpoint: 'feed',
    body,
  });

  if (!resp.success || !resp.data) {
    return { outcome: 'failed', reason: resp.error ?? 'no_data' };
  }

  const data = resp.data;
  if (data.code === 300012) return { outcome: 'deleted' };
  if (isCaptchaErrorCode(data.code)) return { outcome: 'captcha' };
  if (data.code !== 0) return { outcome: 'failed', reason: data.msg ?? `code=${data.code}` };

  const items = data?.data?.items;
  if (!items || items.length === 0) return { outcome: 'deleted' };

  const card = items[0]?.note_card;
  if (!card) return { outcome: 'failed', reason: 'no_note_card' };

  return {
    outcome: 'success',
    desc: card.desc ?? '',
    time: card.time ?? 0,
    tagList: card.tag_list ?? [],
  };
}
