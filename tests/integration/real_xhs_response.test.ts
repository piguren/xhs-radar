/**
 * T-069 集成测试：用真实小红书搜索响应验证 search_parser。
 *
 * 跑流程：
 * 1. 加载 dist/ 到 Chrome（chrome://extensions → 加载已解压扩展）
 * 2. 打开 https://www.xiaohongshu.com/search?keyword=AI 并登录
 * 3. 点扩展图标 popup → "开始诊断捕获"
 * 4. 回到小红书页面慢速滚动 1-2 屏
 * 5. 重新点开扩展图标 → 复制 popup 中的 JSON
 * 6. 保存到 test-fixtures/real-search-response-YYYY-MM-DD.json
 * 7. pnpm vitest run tests/integration -v
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseSearchResponse } from '@/services/xhs/search_parser';

const FIXTURE_DIR = join(__dirname, '..', '..', 'test-fixtures');

function findFixture(): { path: string; data: unknown } | null {
  if (!existsSync(FIXTURE_DIR)) return null;
  const files = readdirSync(FIXTURE_DIR).filter((f) => f.startsWith('real-search-response') && f.endsWith('.json'));
  if (files.length === 0) return null;
  // 拿最新的（按文件名排序）
  const latest = files.sort().pop()!;
  const path = join(FIXTURE_DIR, latest);
  const data = JSON.parse(readFileSync(path, 'utf-8'));
  return { path, data };
}

describe('T-069: search_parser against real XHS response', () => {
  const fixture = findFixture();

  if (!fixture) {
    it.skip('no real-search-response fixture found — see top-of-file instructions', () => {});
    return;
  }

  it(`parses real response from ${fixture.path}`, () => {
    const result = parseSearchResponse(fixture.data as any);
    // 至少能拿到一些笔记（如果都被过滤掉说明 schema/parser 不匹配）
    expect(result.length).toBeGreaterThan(0);
  });

  it('every parsed note has noteId and xsecToken', () => {
    const result = parseSearchResponse(fixture.data as any);
    for (const note of result) {
      expect(note.noteId).toBeTruthy();
      expect(note.xsecToken).toBeTruthy();
    }
  });

  it('every parsed note has numeric interactInfo counts', () => {
    const result = parseSearchResponse(fixture.data as any);
    for (const note of result) {
      expect(typeof note.interactInfo.likedCount).toBe('number');
      expect(typeof note.interactInfo.collectedCount).toBe('number');
      expect(typeof note.interactInfo.commentCount).toBe('number');
      expect(typeof note.interactInfo.shareCount).toBe('number');
    }
  });

  it('shareCount is parsed from real shared_count field (not always 0)', () => {
    const result = parseSearchResponse(fixture.data as any);
    const totalShare = result.reduce((acc, n) => acc + n.interactInfo.shareCount, 0);
    expect(totalShare).toBeGreaterThan(0);
  });

  it('publish time is parsed from corner_tag_info (not hard-coded 0)', () => {
    const result = parseSearchResponse(fixture.data as any);
    for (const note of result) {
      expect(note.time).toBeGreaterThan(0);
    }
  });

  it('every parsed note has user with userId', () => {
    const result = parseSearchResponse(fixture.data as any);
    for (const note of result) {
      expect(note.user.userId).toBeTruthy();
    }
  });
});
