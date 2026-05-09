import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNoteDetail } from '@/services/xhs/detail_fetcher';

describe('fetchNoteDetail (TC A2)', () => {
  let sendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessageMock = vi.fn();
    (global as any).chrome = {
      runtime: { sendMessage: sendMessageMock, lastError: undefined },
    };
  });

  // T1: 正常
  it('returns desc on success', async () => {
    sendMessageMock.mockImplementation((_msg, cb) =>
      cb({
        success: true,
        data: { code: 0, data: { items: [{ note_card: { desc: 'body', time: 1000, tag_list: [] } }] } },
      }),
    );
    const r = await fetchNoteDetail('n1', 'tok');
    expect(r.outcome).toBe('success');
    if (r.outcome === 'success') {
      expect(r.desc).toBe('body');
      expect(r.time).toBe(1000);
    }
  });

  // T3: 笔记已删除
  it('returns deleted when code is 300012', async () => {
    sendMessageMock.mockImplementation((_msg, cb) =>
      cb({ success: true, data: { code: 300012, msg: 'gone' } }),
    );
    const r = await fetchNoteDetail('n1', 'tok');
    expect(r.outcome).toBe('deleted');
  });

  // T4: 验证码触发
  it('returns captcha when code is 461', async () => {
    sendMessageMock.mockImplementation((_msg, cb) =>
      cb({ success: true, data: { code: 461, msg: 'verify' } }),
    );
    const r = await fetchNoteDetail('n1', 'tok');
    expect(r.outcome).toBe('captcha');
  });

  // T9: items 空 -> deleted
  it('returns deleted when items is empty', async () => {
    sendMessageMock.mockImplementation((_msg, cb) =>
      cb({ success: true, data: { code: 0, data: { items: [] } } }),
    );
    const r = await fetchNoteDetail('n1', 'tok');
    expect(r.outcome).toBe('deleted');
  });

  // §4.6 关键参数缺失
  it('returns invalid_args when xsec_token empty', async () => {
    const r = await fetchNoteDetail('n1', '');
    expect(r.outcome).toBe('invalid_args');
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  it('returns invalid_args when noteId empty', async () => {
    const r = await fetchNoteDetail('', 'tok');
    expect(r.outcome).toBe('invalid_args');
  });

  // failed branch
  it('returns failed when relay returns error', async () => {
    sendMessageMock.mockImplementation((_msg, cb) =>
      cb({ success: false, error: 'tab gone' }),
    );
    const r = await fetchNoteDetail('n1', 'tok');
    expect(r.outcome).toBe('failed');
    if (r.outcome === 'failed') expect(r.reason).toBe('tab gone');
  });
});
