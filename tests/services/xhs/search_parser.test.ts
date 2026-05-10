import { describe, it, expect } from 'vitest';
import { parseSearchResponse, XhsAuthError } from '@/services/xhs/search_parser';
import type { XhsSearchNotesResponse } from '@/services/xhs/schemas/search';

const mkCard = (overrides: Partial<{ liked: string; collected: string; comment: string; share: string; type: 'normal' | 'video' }> = {}) => ({
  type: overrides.type ?? 'normal' as 'normal' | 'video',
  display_title: 'T',
  user: { user_id: 'u1', nickname: 'N', avatar: '' },
  interact_info: {
    liked: false, collected: false,
    liked_count: overrides.liked ?? '0',
    collected_count: overrides.collected ?? '0',
    comment_count: overrides.comment ?? '0',
    shared_count: overrides.share ?? '0',
  },
});

const mkResp = (items: XhsSearchNotesResponse['data']['items'], code = 0): XhsSearchNotesResponse => ({
  code, success: code === 0, msg: 'ok', data: { has_more: false, items },
});

describe('parseSearchResponse (TC A1-T1~T9)', () => {
  it('T1: keeps notes, drops hot_query', () => {
    const r = parseSearchResponse(
      mkResp([
        { id: 'n1', model_type: 'note', xsec_token: 'tok1', note_card: mkCard({ liked: '1.2万' }) },
        { id: 'h1', model_type: 'hot_query' },
        { id: 'n2', model_type: 'note', xsec_token: 'tok2', note_card: mkCard({ liked: '999' }) },
      ]),
    );
    expect(r.map((n) => n.noteId)).toEqual(['n1', 'n2']);
  });

  it('T2: empty items -> []', () => {
    expect(parseSearchResponse(mkResp([]))).toEqual([]);
  });

  it('T3: drops items missing xsec_token', () => {
    const r = parseSearchResponse(
      mkResp([
        { id: 'n1', model_type: 'note', xsec_token: '', note_card: mkCard() },
        { id: 'n2', model_type: 'note', xsec_token: 'tok', note_card: mkCard() },
      ]),
    );
    expect(r.map((n) => n.noteId)).toEqual(['n2']);
  });

  it('T4: parses "1.2万" to 12000', () => {
    const r = parseSearchResponse(
      mkResp([{ id: 'n1', model_type: 'note', xsec_token: 't', note_card: mkCard({ liked: '1.2万' }) }]),
    );
    expect(r[0].interactInfo.likedCount).toBe(12000);
  });

  it('T5: parses "999+" to 999', () => {
    const r = parseSearchResponse(
      mkResp([{ id: 'n1', model_type: 'note', xsec_token: 't', note_card: mkCard({ liked: '999+' }) }]),
    );
    expect(r[0].interactInfo.likedCount).toBe(999);
  });

  it('T6: empty count -> 0', () => {
    const r = parseSearchResponse(
      mkResp([{ id: 'n1', model_type: 'note', xsec_token: 't', note_card: mkCard({ liked: '' }) }]),
    );
    expect(r[0].interactInfo.likedCount).toBe(0);
  });

  it('T7: keeps video-type notes', () => {
    const r = parseSearchResponse(
      mkResp([{ id: 'n1', model_type: 'note', xsec_token: 't', note_card: mkCard({ type: 'video', liked: '50' }) }]),
    );
    expect(r).toHaveLength(1);
    expect(r[0].modelType).toBe('note');
  });

  it('T8: drops ad model_type', () => {
    expect(parseSearchResponse(mkResp([{ id: 'ad1', model_type: 'ad' }]))).toEqual([]);
  });

  it('T9: throws XhsAuthError when code=-100', () => {
    expect(() => parseSearchResponse(mkResp([], -100))).toThrow(XhsAuthError);
  });
});
