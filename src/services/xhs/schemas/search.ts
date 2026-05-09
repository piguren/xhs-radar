/**
 * 小红书搜索接口响应 schema（被动拦截）。
 * 字段命名以 xhs_web_crawler-main/README.md 真实样例为准。
 * 对应 docs/prd/xhs-radar-l3.md §3.2。
 */

export type RawCount = string;

export interface XhsSearchNotesResponse {
  code: number;
  success: boolean;
  msg: string;
  data: {
    has_more: boolean;
    items: XhsSearchItem[];
  };
}

export interface XhsSearchItem {
  id: string;
  model_type: 'note' | 'video' | 'rec_query' | 'hot_query' | 'ad';
  xsec_token?: string;
  note_card?: XhsNoteCard;
}

export interface XhsNoteCard {
  type: 'normal' | 'video';
  display_title: string;
  user: {
    user_id: string;
    nickname?: string;
    nick_name?: string;
    avatar?: string;
  };
  interact_info: {
    liked: boolean;
    liked_count: RawCount;
    collected: boolean;
    collected_count: RawCount;
    comment_count: RawCount;
    share_count: RawCount;
    followed?: boolean;
  };
  cover?: {
    url_default?: string;
    url_pre?: string;
    width?: number;
    height?: number;
  };
}
