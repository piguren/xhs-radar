# xhs-radar Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: 推荐使用 `superpowers:subagent-driven-development`（有 subagent 时）或 `superpowers:executing-plans`（无 subagent 时）逐 Task 执行。所有步骤用 `- [ ]` 复选框跟踪。每个实现 subagent 内部严守 `superpowers:test-driven-development` 铁律。

**版本：** v0.1 | **日期：** 2026-05-09
**Goal:** 实现 xhs-radar 一期 MVP — 一个 Chrome 扩展，全屏 Tab Dashboard，从小红书任意赛道搜索结果中识别爆款笔记并 AI 辅助选题
**Architecture:** Manifest V3 + React 19 + TypeScript 5.8 (strict) + Vite 7 + Tailwind 4 + Zustand 4。三层架构强制分层：`src/shell/` 容器层（service worker / content script / popup / dashboard 入口）/ `src/app/` Dashboard React 应用（不可直接 import chrome.\*）/ `src/services/` 抽象层（chrome API + 业务逻辑）。
**Tech Stack:** React 19 / TS 5.8 / Vite 7 / @crxjs/vite-plugin v2 / Tailwind 4 / Zustand 4 / openai (DeepSeek 兼容) / zod / nanoid / vitest / pnpm 9
**Spec Reference:** `docs/prd/xhs-radar-l3.md`（架构 / 类型 / AC / Mock 全部在那里）
**Strategy:** 本 Plan 采用 **Path C 混合策略** — 高风险 Phase 1.6 + 1.7 详写为 5 步骤 / TDD 完整版；其余 Phase 引用 L3 §11 作为索引（实施方按 L3 §11 + Skills 自行组织）。

---

## 文件结构概览（Phase 1.6 + 1.7 详写涉及）

| 文件 | 职责 | Phase |
|---|---|---|
| `src/services/xhs/selectors.ts` | 接口路径常量（热更入口） | 1.6 |
| `src/services/xhs/interceptor_main.ts` | MAIN world 注入脚本（fetch + XHR 双劫持） | 1.6 |
| `src/services/xhs/search_parser.ts` | 解析搜索响应为 NoteRecord[] | 1.6 |
| `src/services/xhs/login_checker.ts` | 检查 web_session cookie | 1.6 |
| `src/services/xhs/captcha_detector.ts` | 检测风控信号（响应 code / DOM） | 1.6 |
| `src/services/xhs/detail_fetcher.ts` | 详情接口主动调用（含重试 / 退避） | 1.6 |
| `src/services/xhs/user_fetcher.ts` | 用户主页接口 + per-user 缓存 | 1.6 |
| `src/shell/content_scripts/xhs_interceptor.ts` | content script 注入 + 转发 | 1.6 |
| `src/services/orchestrator/scrape_state_machine.ts` | 7 状态机 | 1.7 |
| `src/services/orchestrator/candidate_pool.ts` | 候选池累积 + 去重 | 1.7 |
| `src/services/orchestrator/progress_emitter.ts` | 向 dashboard 推送进度 | 1.7 |
| `src/shell/service_worker.ts` | 主路由 + handleStartScrape | 1.7 |
| `src/app/hooks/useScrapeListener.ts` | dashboard 端订阅 SW 进度 | 1.7 |
| `src/app/components/nav/BottomStatusBar.tsx` | 抓取进度状态条 | 1.7 |

---

## Phase 1.6：XHS 接入层（详写）

> 风险等级：🔴 最高 — 涉及 MAIN world 注入、fetch 劫持、签名透传、风控规避。每个 Task 必须先写测试。

### Task T-060：实现 selectors.ts（接口路径集中管理）

**对应 AC：** N/A（基础设施，被后续 Task 依赖）
**Files:**
- Create: `src/services/xhs/selectors.ts`
- Test:   `tests/services/xhs/selectors.test.ts`

- [ ] **Step 1：写失败测试**
```typescript
// tests/services/xhs/selectors.test.ts
import { describe, it, expect } from 'vitest';
import { XHS_SELECTORS, isSearchUrl, isFeedUrl, isUserInfoUrl } from '@/services/xhs/selectors';

describe('XHS_SELECTORS', () => {
  it('exposes all required path constants', () => {
    expect(XHS_SELECTORS.SEARCH_PATH).toBe('/api/sns/web/v1/search/notes');
    expect(XHS_SELECTORS.FEED_PATH).toBe('/api/sns/web/v1/feed');
    expect(XHS_SELECTORS.USER_INFO_PATH).toBe('/api/sns/web/v1/user/otherinfo');
    expect(XHS_SELECTORS.LOGIN_COOKIE_NAME).toBe('web_session');
    expect(XHS_SELECTORS.VERSION).toMatch(/^v\d+$/);
  });

  it('isSearchUrl matches the search endpoint', () => {
    expect(isSearchUrl('https://edith.xiaohongshu.com/api/sns/web/v1/search/notes')).toBe(true);
    expect(isSearchUrl('https://edith.xiaohongshu.com/api/sns/web/v1/feed')).toBe(false);
  });

  it('isFeedUrl matches the feed endpoint', () => {
    expect(isFeedUrl('https://edith.xiaohongshu.com/api/sns/web/v1/feed')).toBe(true);
    expect(isFeedUrl('https://edith.xiaohongshu.com/api/sns/web/v1/search/notes')).toBe(false);
  });

  it('isUserInfoUrl matches the user info endpoint with query string', () => {
    expect(isUserInfoUrl('https://edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo?target_user_id=abc')).toBe(true);
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/services/xhs/selectors -v`
  Expected: FAIL with "Cannot find module '@/services/xhs/selectors'"

- [ ] **Step 3：实现最小代码**
```typescript
// src/services/xhs/selectors.ts

/**
 * 小红书接口路径与选择器集中管理 — 热更入口。
 * 当小红书改版导致工具失效时，优先修改本文件。
 * 必须配合更新 VERSION 字段。
 */
export const XHS_SELECTORS = {
  VERSION: 'v1',
  HOST: 'edith.xiaohongshu.com',
  SEARCH_PATH: '/api/sns/web/v1/search/notes',
  FEED_PATH: '/api/sns/web/v1/feed',
  USER_INFO_PATH: '/api/sns/web/v1/user/otherinfo',
  LOGIN_COOKIE_NAME: 'web_session',
  CAPTCHA_DOM_SELECTOR: '.captcha-container, [class*="captcha"]',
} as const;

export function isSearchUrl(url: string): boolean {
  return url.includes(XHS_SELECTORS.SEARCH_PATH);
}

export function isFeedUrl(url: string): boolean {
  return url.includes(XHS_SELECTORS.FEED_PATH);
}

export function isUserInfoUrl(url: string): boolean {
  return url.includes(XHS_SELECTORS.USER_INFO_PATH);
}
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/services/xhs/selectors -v`
  Expected: PASS (4 tests passing)

- [ ] **Step 5：提交**
```bash
git add src/services/xhs/selectors.ts tests/services/xhs/selectors.test.ts
git commit -m "feat(T-060): xhs selectors module with path constants and url matchers"
```

---

### Task T-061：实现 interceptor_main.ts（MAIN world fetch + XHR 劫持）

**对应 AC：** AC-011（抓取启动后底部状态条出现 — 依赖此模块捕获响应）
**Files:**
- Create: `src/services/xhs/interceptor_main.ts`
- Test:   `tests/services/xhs/interceptor_main.test.ts`

> ⚠️ 此脚本运行在 MAIN world（不能 import 任何 npm 包，必须 IIFE 自执行）。Vite 构建时单独处理。

- [ ] **Step 1：写失败测试**
```typescript
// tests/services/xhs/interceptor_main.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('interceptor_main MAIN world hook', () => {
  let originalFetch: typeof fetch;
  let postMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    originalFetch = global.fetch;
    postMessageMock = vi.fn();
    (global as any).window = { postMessage: postMessageMock };
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete (global as any).window;
  });

  it('intercepts fetch responses matching SEARCH_PATH and posts message', async () => {
    const mockResponse = new Response(JSON.stringify({ code: 0, data: { items: [] } }), { status: 200 });
    global.fetch = vi.fn().mockResolvedValue(mockResponse);

    // 注入逻辑（动态加载 IIFE）
    await import('@/services/xhs/interceptor_main');

    await window.fetch('https://edith.xiaohongshu.com/api/sns/web/v1/search/notes', { method: 'POST' });

    // 等待 microtask
    await new Promise(r => setTimeout(r, 10));

    expect(postMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        __xhs_radar: 'CAPTURED',
        endpoint: 'search',
      }),
      '*',
    );
  });

  it('does NOT intercept unrelated URLs', async () => {
    const mockResponse = new Response('{}', { status: 200 });
    global.fetch = vi.fn().mockResolvedValue(mockResponse);
    await window.fetch('https://example.com/other', { method: 'GET' });
    await new Promise(r => setTimeout(r, 10));
    expect(postMessageMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/services/xhs/interceptor_main -v`
  Expected: FAIL with "Cannot find module '@/services/xhs/interceptor_main'"

- [ ] **Step 3：实现最小代码**
```typescript
// src/services/xhs/interceptor_main.ts
// MAIN world IIFE — 不能 import 任何模块，路径常量内联。

(function () {
  const SEARCH_PATH = '/api/sns/web/v1/search/notes';
  const FEED_PATH = '/api/sns/web/v1/feed';
  const USER_INFO_PATH = '/api/sns/web/v1/user/otherinfo';

  function endpointFor(url: string): 'search' | 'feed' | 'user_info' | null {
    if (url.includes(SEARCH_PATH)) return 'search';
    if (url.includes(FEED_PATH)) return 'feed';
    if (url.includes(USER_INFO_PATH)) return 'user_info';
    return null;
  }

  // === Hook fetch ===
  const origFetch = window.fetch;
  window.fetch = async function (...args: Parameters<typeof fetch>) {
    const response = await origFetch.apply(this, args);
    try {
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
      const ep = endpointFor(url);
      if (ep) {
        response
          .clone()
          .json()
          .then(data => {
            window.postMessage({ __xhs_radar: 'CAPTURED', endpoint: ep, payload: data }, '*');
          })
          .catch(() => void 0);
      }
    } catch {
      /* ignore */
    }
    return response;
  };

  // === Hook XHR ===
  const origXhrOpen = XMLHttpRequest.prototype.open;
  const origXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (
    method: string,
    url: string | URL,
    ...rest: unknown[]
  ) {
    (this as any).__xhs_url = typeof url === 'string' ? url : url.toString();
    return origXhrOpen.apply(this, [method, url, ...rest] as any);
  };
  XMLHttpRequest.prototype.send = function (...args: any[]) {
    this.addEventListener('load', () => {
      const u = (this as any).__xhs_url as string | undefined;
      if (!u) return;
      const ep = endpointFor(u);
      if (!ep) return;
      try {
        const data = JSON.parse(this.responseText);
        window.postMessage({ __xhs_radar: 'CAPTURED', endpoint: ep, payload: data }, '*');
      } catch {
        /* ignore */
      }
    });
    return origXhrSend.apply(this, args);
  };
})();

export {};  // 让 TS 识别为模块（vitest 测试可以 import）
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/services/xhs/interceptor_main -v`
  Expected: PASS (2 tests)

- [ ] **Step 5：提交**
```bash
git add src/services/xhs/interceptor_main.ts tests/services/xhs/interceptor_main.test.ts
git commit -m "feat(T-061): MAIN world fetch + XHR interceptor with endpoint classification"
```

---

### Task T-062：实现 xhs_interceptor.ts（content script 注入与转发）

**对应 AC：** AC-011, AC-012
**Files:**
- Create: `src/shell/content_scripts/xhs_interceptor.ts`
- Test:   `tests/shell/content_scripts/xhs_interceptor.test.ts`

- [ ] **Step 1：写失败测试**
```typescript
// tests/shell/content_scripts/xhs_interceptor.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('xhs_interceptor content script', () => {
  let chromeRuntimeMock: any;

  beforeEach(() => {
    chromeRuntimeMock = {
      onMessage: { addListener: vi.fn() },
      sendMessage: vi.fn(),
      getURL: vi.fn((p: string) => `chrome-extension://abc/${p}`),
    };
    (global as any).chrome = { runtime: chromeRuntimeMock };
    (global as any).window = {
      addEventListener: vi.fn(),
      scrollBy: vi.fn(),
      innerHeight: 800,
    };
    (global as any).document = {
      head: { appendChild: vi.fn() },
      documentElement: { appendChild: vi.fn() },
      createElement: vi.fn(() => ({ src: '', remove: vi.fn(), onload: null })),
    };
  });

  it('registers chrome.runtime.onMessage listener on import', async () => {
    await import('@/shell/content_scripts/xhs_interceptor');
    expect(chromeRuntimeMock.onMessage.addListener).toHaveBeenCalled();
  });

  it('forwards CAPTURED window messages to service worker with batchId', async () => {
    const mod = await import('@/shell/content_scripts/xhs_interceptor');
    mod.__test_setBatchId('btch_test');

    const winListener = (window.addEventListener as any).mock.calls.find(c => c[0] === 'message')[1];
    winListener({
      source: window,
      data: { __xhs_radar: 'CAPTURED', endpoint: 'search', payload: { foo: 'bar' } },
    });

    expect(chromeRuntimeMock.sendMessage).toHaveBeenCalledWith({
      kind: 'NOTES_CAPTURED',
      batchId: 'btch_test',
      endpoint: 'search',
      payload: { foo: 'bar' },
    });
  });

  it('does not forward when batchId is null', async () => {
    const mod = await import('@/shell/content_scripts/xhs_interceptor');
    mod.__test_setBatchId(null);

    const winListener = (window.addEventListener as any).mock.calls.find(c => c[0] === 'message')[1];
    winListener({
      source: window,
      data: { __xhs_radar: 'CAPTURED', endpoint: 'search', payload: { foo: 'bar' } },
    });

    expect(chromeRuntimeMock.sendMessage).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/shell/content_scripts/xhs_interceptor -v`
  Expected: FAIL with "Cannot find module"

- [ ] **Step 3：实现最小代码**
```typescript
// src/shell/content_scripts/xhs_interceptor.ts

let captureBatchId: string | null = null;

// 注入 MAIN world 脚本
function injectMainWorldHook(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('interceptor_main.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
}

// 监听来自 service worker 的指令
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.kind === 'BEGIN_INTERCEPT') {
    captureBatchId = msg.batchId;
    injectMainWorldHook();
  }
  if (msg.kind === 'END_INTERCEPT') {
    captureBatchId = null;
  }
  if (msg.kind === 'SCROLL_ONCE') {
    window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });
  }
});

// 监听 MAIN world 投递的捕获消息
window.addEventListener('message', (e: MessageEvent) => {
  if (e.source !== window) return;
  if ((e.data as any)?.__xhs_radar !== 'CAPTURED') return;
  if (!captureBatchId) return;

  chrome.runtime.sendMessage({
    kind: 'NOTES_CAPTURED',
    batchId: captureBatchId,
    endpoint: e.data.endpoint,
    payload: e.data.payload,
  });
});

// 仅供测试访问内部状态
export const __test_setBatchId = (id: string | null): void => {
  captureBatchId = id;
};
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/shell/content_scripts/xhs_interceptor -v`
  Expected: PASS (3 tests)

- [ ] **Step 5：提交**
```bash
git add src/shell/content_scripts/xhs_interceptor.ts tests/shell/content_scripts/xhs_interceptor.test.ts
git commit -m "feat(T-062): content script with MAIN world injection and message forwarding"
```

---

### Task T-063：配置 manifest.config.ts 加入 web_accessible_resources

**对应 AC：** N/A（构建配置）
**Files:**
- Modify: `manifest.config.ts`

- [ ] **Step 1：写失败测试**
```typescript
// tests/manifest.config.test.ts
import { describe, it, expect } from 'vitest';
import manifest from '../manifest.config';

describe('manifest.config', () => {
  it('declares interceptor_main.js as web accessible resource', () => {
    const war = (manifest as any).web_accessible_resources;
    expect(war).toBeInstanceOf(Array);
    expect(war[0].resources).toContain('interceptor_main.js');
    expect(war[0].matches).toContain('*://*.xiaohongshu.com/*');
  });

  it('content_scripts target xiaohongshu domains', () => {
    const cs = (manifest as any).content_scripts;
    expect(cs).toBeInstanceOf(Array);
    expect(cs[0].matches).toContain('*://*.xiaohongshu.com/*');
    expect(cs[0].js).toContain('src/shell/content_scripts/xhs_interceptor.ts');
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/manifest.config -v`
  Expected: FAIL（web_accessible_resources 未声明 / content_scripts 缺失）

- [ ] **Step 3：实现最小代码**
```typescript
// manifest.config.ts （在 defineManifest 中追加）
import { defineManifest } from '@crxjs/vite-plugin';

export default defineManifest({
  manifest_version: 3,
  name: 'xhs-radar 赛道爆款雷达',
  version: '0.1.0',
  description: '在小红书任意赛道发现爆款笔记并 AI 辅助选题',
  icons: {
    16: 'public/icon_16.png',
    48: 'public/icon_48.png',
    128: 'public/icon_128.png',
  },
  action: {
    default_popup: 'public/popup.html',
    default_icon: 'public/icon_48.png',
  },
  background: {
    service_worker: 'src/shell/service_worker.ts',
    type: 'module',
  },
  content_scripts: [
    {
      matches: ['*://*.xiaohongshu.com/*'],
      js: ['src/shell/content_scripts/xhs_interceptor.ts'],
      run_at: 'document_idle',
    },
  ],
  permissions: ['storage', 'tabs', 'scripting', 'activeTab', 'cookies'],
  host_permissions: ['*://*.xiaohongshu.com/*', 'https://api.deepseek.com/*'],
  web_accessible_resources: [
    {
      resources: ['interceptor_main.js'],
      matches: ['*://*.xiaohongshu.com/*'],
    },
  ],
});
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/manifest.config -v`
  Expected: PASS (2 tests)

- [ ] **Step 5：提交**
```bash
git add manifest.config.ts tests/manifest.config.test.ts
git commit -m "feat(T-063): manifest with web_accessible_resources for MAIN world script"
```

---

### Task T-064：实现 search_parser.ts（解析搜索响应为 NoteRecord[]）

**对应 AC：** AC-011, AC-013, AC-017（依赖此 parser 产出 NoteRecord）
**Files:**
- Create: `src/services/xhs/search_parser.ts`
- Test:   `tests/services/xhs/search_parser.test.ts`

> 覆盖 L3 §4.2 测试用例 TC A1-T1 ~ T9。

- [ ] **Step 1：写失败测试（覆盖 9 个 TC）**
```typescript
// tests/services/xhs/search_parser.test.ts
import { describe, it, expect } from 'vitest';
import { parseSearchResponse } from '@/services/xhs/search_parser';
import type { XhsSearchNotesResponse } from '@/services/xhs/schemas/search';

describe('parseSearchResponse', () => {
  // TC A1-T1: 正常响应保留 note，剔除 hot_query
  it('keeps notes and filters out hot_query', () => {
    const resp: XhsSearchNotesResponse = {
      code: 0,
      success: true,
      msg: 'ok',
      data: {
        has_more: true,
        items: [
          { id: 'n1', model_type: 'note', xsec_token: 'tok1',
            note_card: makeNoteCard('Title 1', '1.2万', '500', '50', '10') },
          { id: 'h1', model_type: 'hot_query' } as any,
          { id: 'n2', model_type: 'note', xsec_token: 'tok2',
            note_card: makeNoteCard('Title 2', '999', '99', '9', '1') },
        ],
      },
    };
    const result = parseSearchResponse(resp);
    expect(result).toHaveLength(2);
    expect(result.map(n => n.noteId)).toEqual(['n1', 'n2']);
  });

  // TC A1-T2: items 为空
  it('returns empty array when items is empty', () => {
    expect(parseSearchResponse({ code: 0, success: true, msg: '', data: { has_more: false, items: [] } })).toEqual([]);
  });

  // TC A1-T3: 缺 xsec_token 的项跳过
  it('drops items missing xsec_token', () => {
    const resp: XhsSearchNotesResponse = {
      code: 0, success: true, msg: '',
      data: {
        has_more: false,
        items: [
          { id: 'n1', model_type: 'note', xsec_token: '', note_card: makeNoteCard('T', '100', '10', '1', '0') },
          { id: 'n2', model_type: 'note', xsec_token: 'tok', note_card: makeNoteCard('T2', '100', '10', '1', '0') },
        ],
      },
    };
    expect(parseSearchResponse(resp).map(n => n.noteId)).toEqual(['n2']);
  });

  // TC A1-T4: "1.2万" → 12000
  it('parses Chinese count "1.2万" to 12000', () => {
    const resp = makeSingleResp('n1', 'tok', { liked: '1.2万' });
    expect(parseSearchResponse(resp)[0].interactInfo.likedCount).toBe(12000);
  });

  // TC A1-T5: "999+" → 999
  it('parses count with plus sign "999+" to 999', () => {
    const resp = makeSingleResp('n1', 'tok', { liked: '999+' });
    expect(parseSearchResponse(resp)[0].interactInfo.likedCount).toBe(999);
  });

  // TC A1-T6: 空字符串 → 0
  it('parses empty count to 0', () => {
    const resp = makeSingleResp('n1', 'tok', { liked: '' });
    expect(parseSearchResponse(resp)[0].interactInfo.likedCount).toBe(0);
  });

  // TC A1-T7: 视频笔记保留
  it('keeps video-type notes', () => {
    const resp = makeSingleResp('n1', 'tok', { liked: '100' }, { type: 'video' });
    const result = parseSearchResponse(resp);
    expect(result).toHaveLength(1);
    expect(result[0].modelType).toBe('note');
  });

  // TC A1-T8: 广告项跳过
  it('drops ad model_type', () => {
    const resp: XhsSearchNotesResponse = {
      code: 0, success: true, msg: '',
      data: { has_more: false, items: [{ id: 'ad1', model_type: 'ad' } as any] },
    };
    expect(parseSearchResponse(resp)).toEqual([]);
  });

  // TC A1-T9: code !== 0 抛 XhsAuthError
  it('throws XhsAuthError when code is -100', () => {
    const resp = { code: -100, success: false, msg: 'unauth', data: { has_more: false, items: [] } } as XhsSearchNotesResponse;
    expect(() => parseSearchResponse(resp)).toThrow('XhsAuthError');
  });

  // helpers
  function makeNoteCard(title: string, liked: string, collected: string, comment: string, share: string) {
    return {
      type: 'normal' as const,
      display_title: title,
      user: { user_id: 'u1', nickname: 'Test', avatar: 'http://x.com/a.jpg' },
      interact_info: { liked: false, liked_count: liked, collected: false, collected_count: collected, comment_count: comment, share_count: share },
    };
  }
  function makeSingleResp(id: string, token: string, counts: Partial<{ liked: string; collected: string; comment: string; share: string }>, opts?: { type?: 'normal' | 'video' }): XhsSearchNotesResponse {
    return {
      code: 0, success: true, msg: '',
      data: { has_more: false, items: [{ id, model_type: 'note', xsec_token: token,
        note_card: { ...makeNoteCard('T', counts.liked ?? '0', counts.collected ?? '0', counts.comment ?? '0', counts.share ?? '0'), type: opts?.type ?? 'normal' },
      }] },
    };
  }
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/services/xhs/search_parser -v`
  Expected: FAIL with "Cannot find module '@/services/xhs/search_parser'"

- [ ] **Step 3：实现最小代码**
```typescript
// src/services/xhs/search_parser.ts
import type { XhsSearchNotesResponse } from './schemas/search';
import type { NoteRecord } from '@/app/store/batchStore';
import { parseCount } from '../scoring/parse_count';

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
    return []; // 其他错误码由调用方处理
  }

  const items = resp.data?.items ?? [];
  const out: NoteRecord[] = [];

  for (const item of items) {
    if (item.model_type !== 'note') continue;
    if (!item.note_card) continue;
    if (!item.note_card.user) continue;
    if (!item.xsec_token) continue;

    const card = item.note_card;
    const ii = card.interact_info;

    out.push({
      noteId: item.id,
      xsecToken: item.xsec_token,
      modelType: 'note',
      title: card.display_title ?? '',
      time: 0,                   // 详情接口补
      lastUpdateTime: 0,
      tagList: [],               // 详情接口补
      user: {
        userId: card.user.user_id,
        nickname: card.user.nickname ?? card.user.nick_name ?? '',
        avatar: card.user.avatar ?? '',
        fans: null,              // 用户接口补
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
```

> ⚠️ 此 Task 同时需要 `parse_count` 函数（T-020 已经存在）和 schemas/search.ts（来自 L3 §3.2，需从 PRD 摘出）。如这两个依赖未实现，先实现它们。

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/services/xhs/search_parser -v`
  Expected: PASS (9 tests)

- [ ] **Step 5：提交**
```bash
git add src/services/xhs/search_parser.ts tests/services/xhs/search_parser.test.ts
git commit -m "feat(T-064): search response parser with 9 boundary cases (TC A1-T1~T9)"
```

---

### Task T-065：实现 login_checker.ts

**对应 AC：** AC-010
**Files:**
- Create: `src/services/xhs/login_checker.ts`
- Test:   `tests/services/xhs/login_checker.test.ts`

- [ ] **Step 1：写失败测试**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { isLoggedIn } from '@/services/xhs/login_checker';

describe('isLoggedIn', () => {
  let cookiesGet: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    cookiesGet = vi.fn();
    (global as any).chrome = { cookies: { get: cookiesGet } };
  });

  it('returns true when web_session cookie exists with non-empty value', async () => {
    cookiesGet.mockImplementation((_, cb) => cb({ name: 'web_session', value: 'abc123', domain: '.xiaohongshu.com' }));
    expect(await isLoggedIn()).toBe(true);
  });

  it('returns false when cookie is null', async () => {
    cookiesGet.mockImplementation((_, cb) => cb(null));
    expect(await isLoggedIn()).toBe(false);
  });

  it('returns false when cookie value is empty string', async () => {
    cookiesGet.mockImplementation((_, cb) => cb({ name: 'web_session', value: '', domain: '.xiaohongshu.com' }));
    expect(await isLoggedIn()).toBe(false);
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/services/xhs/login_checker -v`
  Expected: FAIL

- [ ] **Step 3：实现最小代码**
```typescript
// src/services/xhs/login_checker.ts
import { XHS_SELECTORS } from './selectors';

export function isLoggedIn(): Promise<boolean> {
  return new Promise(resolve => {
    chrome.cookies.get(
      { url: 'https://www.xiaohongshu.com', name: XHS_SELECTORS.LOGIN_COOKIE_NAME },
      (cookie) => {
        resolve(!!cookie && cookie.value.length > 0);
      },
    );
  });
}
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/services/xhs/login_checker -v`
  Expected: PASS (3 tests)

- [ ] **Step 5：提交**
```bash
git add src/services/xhs/login_checker.ts tests/services/xhs/login_checker.test.ts
git commit -m "feat(T-065): login_checker via chrome.cookies for web_session"
```

---

### Task T-066：实现 captcha_detector.ts

**对应 AC：** AC-014
**Files:**
- Create: `src/services/xhs/captcha_detector.ts`
- Test:   `tests/services/xhs/captcha_detector.test.ts`

- [ ] **Step 1：写失败测试**
```typescript
import { describe, it, expect } from 'vitest';
import { isCaptchaResponse, isCaptchaErrorCode } from '@/services/xhs/captcha_detector';

describe('captcha detector', () => {
  it('detects captcha by xhs error code 461', () => {
    expect(isCaptchaErrorCode(461)).toBe(true);
    expect(isCaptchaErrorCode(0)).toBe(false);
    expect(isCaptchaErrorCode(-100)).toBe(false);
  });

  it('detects captcha in API response with code 461', () => {
    expect(isCaptchaResponse({ code: 461, msg: 'verify' })).toBe(true);
    expect(isCaptchaResponse({ code: 0 })).toBe(false);
  });

  it('detects captcha when response message contains 验证', () => {
    expect(isCaptchaResponse({ code: -200, msg: '请完成验证' })).toBe(true);
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/services/xhs/captcha_detector -v`
  Expected: FAIL

- [ ] **Step 3：实现最小代码**
```typescript
// src/services/xhs/captcha_detector.ts

export function isCaptchaErrorCode(code: number): boolean {
  return code === 461;
}

export function isCaptchaResponse(resp: { code?: number; msg?: string }): boolean {
  if (resp.code !== undefined && isCaptchaErrorCode(resp.code)) return true;
  if (resp.msg && /验证|captcha/i.test(resp.msg)) return true;
  return false;
}
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/services/xhs/captcha_detector -v`
  Expected: PASS (3 tests)

- [ ] **Step 5：提交**
```bash
git add src/services/xhs/captcha_detector.ts tests/services/xhs/captcha_detector.test.ts
git commit -m "feat(T-066): captcha detection via error code 461 and message keyword"
```

---

### Task T-067：实现 detail_fetcher.ts

**对应 AC：** AC-022
**Files:**
- Create: `src/services/xhs/detail_fetcher.ts`
- Test:   `tests/services/xhs/detail_fetcher.test.ts`

> 此 fetcher 通过 service worker → content script → fetch 中转。覆盖 L3 §4.3 TC A2-T1~T10 的关键 case。

- [ ] **Step 1：写失败测试（覆盖 5 个核心 TC）**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchNoteDetail, DetailFetchOutcome } from '@/services/xhs/detail_fetcher';

describe('fetchNoteDetail', () => {
  let sendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessageMock = vi.fn();
    (global as any).chrome = {
      runtime: { sendMessage: sendMessageMock },
      tabs: { sendMessage: vi.fn(), query: vi.fn((_, cb) => cb([{ id: 1 }])) },
    };
    vi.useFakeTimers();
  });

  // TC A2-T1: 正常
  it('returns desc on success', async () => {
    sendMessageMock.mockResolvedValue({
      success: true,
      data: { code: 0, data: { items: [{ note_card: { desc: 'body', time: 1000, tag_list: [] } }] } },
    });
    const r = await fetchNoteDetail('n1', 'tok');
    expect(r.outcome).toBe('success');
    if (r.outcome === 'success') {
      expect(r.desc).toBe('body');
      expect(r.time).toBe(1000);
    }
  });

  // TC A2-T3: 笔记已删除
  it('returns deleted when code is 300012', async () => {
    sendMessageMock.mockResolvedValue({ success: true, data: { code: 300012, msg: 'gone' } });
    const r = await fetchNoteDetail('n1', 'tok');
    expect(r.outcome).toBe('deleted');
  });

  // TC A2-T4: 验证码触发
  it('returns captcha when code is 461', async () => {
    sendMessageMock.mockResolvedValue({ success: true, data: { code: 461, msg: 'verify' } });
    const r = await fetchNoteDetail('n1', 'tok');
    expect(r.outcome).toBe('captcha');
  });

  // TC A2-T9: items 长度 0 视为已删除
  it('returns deleted when items is empty', async () => {
    sendMessageMock.mockResolvedValue({ success: true, data: { code: 0, data: { items: [] } } });
    const r = await fetchNoteDetail('n1', 'tok');
    expect(r.outcome).toBe('deleted');
  });

  // 关键参数缺失（§4.6）
  it('returns invalid_args when xsecToken is empty', async () => {
    const r = await fetchNoteDetail('n1', '');
    expect(r.outcome).toBe('invalid_args');
    expect(sendMessageMock).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/services/xhs/detail_fetcher -v`
  Expected: FAIL

- [ ] **Step 3：实现最小代码**
```typescript
// src/services/xhs/detail_fetcher.ts
import { isCaptchaErrorCode } from './captcha_detector';

export type DetailFetchOutcome =
  | { outcome: 'success'; desc: string; time: number; tagList: Array<{ type: string; name: string; id?: string }> }
  | { outcome: 'deleted' }
  | { outcome: 'captcha' }
  | { outcome: 'invalid_args' }
  | { outcome: 'failed'; reason: string };

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

  // 通过 SW 中转到 content script，再由 content script 在小红书源下 fetch
  const resp = await chrome.runtime.sendMessage({ kind: 'CONTENT_SCRIPT_FETCH', body, endpoint: 'feed' });

  if (!resp.success) {
    return { outcome: 'failed', reason: resp.error ?? 'unknown' };
  }

  const data = resp.data;
  if (data.code === 300012) return { outcome: 'deleted' };
  if (isCaptchaErrorCode(data.code)) return { outcome: 'captcha' };

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
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/services/xhs/detail_fetcher -v`
  Expected: PASS (5 tests)

- [ ] **Step 5：提交**
```bash
git add src/services/xhs/detail_fetcher.ts tests/services/xhs/detail_fetcher.test.ts
git commit -m "feat(T-067): detail fetcher with 5 outcome variants (TC A2 core)"
```

---

### Task T-068：实现 user_fetcher.ts（含 per-user 缓存）

**对应 AC：** AC-020（卡片显示粉丝数）
**Files:**
- Create: `src/services/xhs/user_fetcher.ts`
- Test:   `tests/services/xhs/user_fetcher.test.ts`

- [ ] **Step 1：写失败测试（覆盖 4 个核心 TC）**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchUserFans, __test_clearFanCache } from '@/services/xhs/user_fetcher';

describe('fetchUserFans', () => {
  let sendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessageMock = vi.fn();
    (global as any).chrome = { runtime: { sendMessage: sendMessageMock } };
    __test_clearFanCache();
  });

  // TC A3-T1: 正常
  it('returns fan count from interactions', async () => {
    sendMessageMock.mockResolvedValue({
      success: true,
      data: { code: 0, data: { interactions: [{ type: 'follows', count: '20' }, { type: 'fans', count: '8.6万' }] } },
    });
    expect(await fetchUserFans('u1')).toBe(86000);
  });

  // TC A3-T2: 没有 fans 字段
  it('returns null when no fans interaction', async () => {
    sendMessageMock.mockResolvedValue({ success: true, data: { code: 0, data: { interactions: [] } } });
    expect(await fetchUserFans('u1')).toBeNull();
  });

  // TC A3-T5: 空 userId
  it('returns null and does not request when userId is empty', async () => {
    expect(await fetchUserFans('')).toBeNull();
    expect(sendMessageMock).not.toHaveBeenCalled();
  });

  // TC A3-T6: 缓存命中
  it('caches result by userId, second call hits cache', async () => {
    sendMessageMock.mockResolvedValue({
      success: true,
      data: { code: 0, data: { interactions: [{ type: 'fans', count: '100' }] } },
    });
    expect(await fetchUserFans('u1')).toBe(100);
    expect(await fetchUserFans('u1')).toBe(100);
    expect(sendMessageMock).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/services/xhs/user_fetcher -v`
  Expected: FAIL

- [ ] **Step 3：实现最小代码**
```typescript
// src/services/xhs/user_fetcher.ts
import { parseCount } from '../scoring/parse_count';

const fanCache = new Map<string, number | null>();

export async function fetchUserFans(userId: string): Promise<number | null> {
  if (!userId) return null;
  if (fanCache.has(userId)) return fanCache.get(userId)!;

  const resp = await chrome.runtime.sendMessage({
    kind: 'CONTENT_SCRIPT_FETCH',
    method: 'GET',
    endpoint: 'user_info',
    query: { target_user_id: userId },
  });

  if (!resp.success || resp.data.code !== 0) {
    fanCache.set(userId, null);
    return null;
  }

  const interactions: Array<{ type: string; count: string }> = resp.data?.data?.interactions ?? [];
  const fansEntry = interactions.find(i => i.type === 'fans');
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
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/services/xhs/user_fetcher -v`
  Expected: PASS (4 tests)

- [ ] **Step 5：提交**
```bash
git add src/services/xhs/user_fetcher.ts tests/services/xhs/user_fetcher.test.ts
git commit -m "feat(T-068): user fetcher with per-user fan cache (TC A3 core)"
```

---

### Task T-069：手动联调 — 验证 search_parser 在真实小红书页面工作

**对应 AC：** AC-011（启动后状态条显示候选数 — 依赖此联调成功）
**Files:** N/A（手动操作 + 文档化）

- [ ] **Step 1：构建并加载扩展**
```bash
pnpm dev
# Chrome → chrome://extensions/ → 启用开发者模式 → 加载已解压扩展程序 → 选 dist/
```

- [ ] **Step 2：在小红书搜索页注入 batchId**
  - 打开 `https://www.xiaohongshu.com/search?keyword=AI`
  - 打开 DevTools → Console
  - 执行：`chrome.runtime.sendMessage({ kind: 'BEGIN_INTERCEPT', batchId: 'manual_test' })`

- [ ] **Step 3：手动滚动 + 观察日志**
  - 在小红书页面滚动 1–2 次
  - 检查 service worker 控制台（chrome://extensions → 检查视图 service worker），确认收到 `NOTES_CAPTURED` 消息
  - 确认 `payload.data.items` 存在且 model_type === 'note' 的项 ≥ 1

- [ ] **Step 4：把响应原始 JSON 复制存档**
```bash
mkdir -p test-fixtures
# 把 service worker 控制台中的 payload 完整 JSON 拷出来，保存为：
# test-fixtures/real-search-response-2026-05-09.json
```

- [ ] **Step 5：用真实 JSON 跑 search_parser 验证**
```typescript
// tests/integration/real_xhs_response.test.ts
import { describe, it, expect } from 'vitest';
import realResp from '../../test-fixtures/real-search-response-2026-05-09.json';
import { parseSearchResponse } from '@/services/xhs/search_parser';

describe('search_parser against real XHS response', () => {
  it('produces non-empty NoteRecord[] from real captured response', () => {
    const result = parseSearchResponse(realResp as any);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0]).toHaveProperty('noteId');
    expect(result[0]).toHaveProperty('xsecToken');
    expect(result[0].interactInfo.likedCount).toBeTypeOf('number');
  });
});
```
  Run: `pnpm vitest run tests/integration/real_xhs_response -v`
  Expected: PASS

  > 如失败 → 对比真实响应字段名与 `schemas/search.ts`，更新 `selectors.ts` 的 VERSION 并打 commit 标 `[selectors-update]`

- [ ] **Step 6：提交**
```bash
git add test-fixtures/real-search-response-2026-05-09.json tests/integration/real_xhs_response.test.ts
git commit -m "test(T-069): integration test with real XHS search response captured 2026-05-09"
```

---

## Phase 1.7：抓取协调器（详写）

> 风险等级：🔴 高 — 编排逻辑、状态机、风控暂停恢复。这部分错了整个抓取流程跑不通。

### Task T-070：实现 scrape_state_machine.ts

**对应 AC：** AC-011, AC-012, AC-013, AC-014
**Files:**
- Create: `src/services/orchestrator/scrape_state_machine.ts`
- Test:   `tests/services/orchestrator/scrape_state_machine.test.ts`

- [ ] **Step 1：写失败测试**
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { ScrapeStateMachine, type ScrapeStatus } from '@/services/orchestrator/scrape_state_machine';

describe('ScrapeStateMachine', () => {
  let sm: ScrapeStateMachine;

  beforeEach(() => {
    sm = new ScrapeStateMachine();
  });

  it('starts in idle', () => {
    expect(sm.current).toBe('idle');
  });

  it('allows valid transitions: idle -> validating -> scraping -> detail_fetching -> complete', () => {
    expect(sm.transition('validating')).toBe(true);
    expect(sm.transition('scraping')).toBe(true);
    expect(sm.transition('detail_fetching')).toBe(true);
    expect(sm.transition('complete')).toBe(true);
    expect(sm.current).toBe('complete');
  });

  it('rejects invalid transitions: idle -> complete', () => {
    expect(sm.transition('complete')).toBe(false);
    expect(sm.current).toBe('idle');
  });

  it('allows scraping <-> captcha_paused round trip', () => {
    sm.transition('validating');
    sm.transition('scraping');
    expect(sm.transition('captcha_paused')).toBe(true);
    expect(sm.transition('scraping')).toBe(true);
  });

  it('terminal states (complete/failed/stopped) reject further transitions', () => {
    sm.transition('validating');
    sm.transition('failed');
    expect(sm.transition('scraping')).toBe(false);
    expect(sm.current).toBe('failed');
  });

  it('reset returns to idle from any state', () => {
    sm.transition('validating');
    sm.transition('scraping');
    sm.reset();
    expect(sm.current).toBe('idle');
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/services/orchestrator/scrape_state_machine -v`
  Expected: FAIL

- [ ] **Step 3：实现最小代码**
```typescript
// src/services/orchestrator/scrape_state_machine.ts

export type ScrapeStatus =
  | 'idle' | 'validating' | 'scraping' | 'captcha_paused'
  | 'detail_fetching' | 'complete' | 'stopped' | 'failed';

const TRANSITIONS: Record<ScrapeStatus, ScrapeStatus[]> = {
  idle: ['validating'],
  validating: ['scraping', 'failed', 'stopped'],
  scraping: ['captcha_paused', 'detail_fetching', 'failed', 'stopped'],
  captcha_paused: ['scraping', 'stopped', 'failed'],
  detail_fetching: ['complete', 'failed', 'stopped'],
  complete: [],
  stopped: [],
  failed: [],
};

export class ScrapeStateMachine {
  private state: ScrapeStatus = 'idle';

  get current(): ScrapeStatus {
    return this.state;
  }

  transition(next: ScrapeStatus): boolean {
    const allowed = TRANSITIONS[this.state];
    if (!allowed.includes(next)) return false;
    this.state = next;
    return true;
  }

  reset(): void {
    this.state = 'idle';
  }
}
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/services/orchestrator/scrape_state_machine -v`
  Expected: PASS (6 tests)

- [ ] **Step 5：提交**
```bash
git add src/services/orchestrator/scrape_state_machine.ts tests/services/orchestrator/scrape_state_machine.test.ts
git commit -m "feat(T-070): scrape state machine with 7 states and transition validation"
```

---

### Task T-071：实现 candidate_pool.ts

**对应 AC：** AC-013（候选池满后停止）
**Files:**
- Create: `src/services/orchestrator/candidate_pool.ts`
- Test:   `tests/services/orchestrator/candidate_pool.test.ts`

- [ ] **Step 1：写失败测试**
```typescript
import { describe, it, expect } from 'vitest';
import { CandidatePool } from '@/services/orchestrator/candidate_pool';
import type { NoteRecord } from '@/app/store/batchStore';

const mkNote = (id: string): NoteRecord => ({ noteId: id } as any);

describe('CandidatePool', () => {
  it('starts empty', () => {
    const p = new CandidatePool(200);
    expect(p.size).toBe(0);
    expect(p.notes).toEqual([]);
  });

  it('add deduplicates by noteId', () => {
    const p = new CandidatePool(200);
    expect(p.add([mkNote('a'), mkNote('b'), mkNote('a')])).toBe(2); // 仅新增 2 条
    expect(p.size).toBe(2);
    expect(p.add([mkNote('a')])).toBe(0);
    expect(p.size).toBe(2);
  });

  it('respects upper bound', () => {
    const p = new CandidatePool(3);
    p.add([mkNote('a'), mkNote('b'), mkNote('c'), mkNote('d')]);
    expect(p.size).toBe(3);
    expect(p.notes.map(n => n.noteId)).toEqual(['a', 'b', 'c']);
    expect(p.isFull).toBe(true);
  });

  it('not full when below max', () => {
    const p = new CandidatePool(10);
    p.add([mkNote('a')]);
    expect(p.isFull).toBe(false);
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/services/orchestrator/candidate_pool -v`
  Expected: FAIL

- [ ] **Step 3：实现最小代码**
```typescript
// src/services/orchestrator/candidate_pool.ts
import type { NoteRecord } from '@/app/store/batchStore';

export class CandidatePool {
  private items: NoteRecord[] = [];
  private seen = new Set<string>();

  constructor(private readonly max: number) {}

  get size(): number {
    return this.items.length;
  }

  get isFull(): boolean {
    return this.items.length >= this.max;
  }

  get notes(): NoteRecord[] {
    return this.items;
  }

  /** 返回新增的笔记数量 */
  add(batch: NoteRecord[]): number {
    let added = 0;
    for (const n of batch) {
      if (this.isFull) break;
      if (this.seen.has(n.noteId)) continue;
      this.seen.add(n.noteId);
      this.items.push(n);
      added++;
    }
    return added;
  }
}
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/services/orchestrator/candidate_pool -v`
  Expected: PASS (4 tests)

- [ ] **Step 5：提交**
```bash
git add src/services/orchestrator/candidate_pool.ts tests/services/orchestrator/candidate_pool.test.ts
git commit -m "feat(T-071): candidate pool with dedup by noteId and upper-bound enforcement"
```

---

### Task T-072：实现 progress_emitter.ts

**对应 AC：** AC-012（状态条实时更新）
**Files:**
- Create: `src/services/orchestrator/progress_emitter.ts`
- Test:   `tests/services/orchestrator/progress_emitter.test.ts`

- [ ] **Step 1：写失败测试**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressEmitter } from '@/services/orchestrator/progress_emitter';

describe('ProgressEmitter', () => {
  let sendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessageMock = vi.fn();
    (global as any).chrome = { runtime: { sendMessage: sendMessageMock } };
  });

  it('emits SCRAPE_PROGRESS message with patch', () => {
    const e = new ProgressEmitter('btch_1');
    e.emit({ candidateCount: 50, currentKeyword: 'AI' });
    expect(sendMessageMock).toHaveBeenCalledWith({
      kind: 'SCRAPE_PROGRESS',
      batchId: 'btch_1',
      patch: { candidateCount: 50, currentKeyword: 'AI' },
    });
  });

  it('emits final status separately', () => {
    const e = new ProgressEmitter('btch_1');
    e.emitStatus('complete');
    expect(sendMessageMock).toHaveBeenCalledWith({
      kind: 'SCRAPE_STATUS',
      batchId: 'btch_1',
      status: 'complete',
    });
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/services/orchestrator/progress_emitter -v`
  Expected: FAIL

- [ ] **Step 3：实现最小代码**
```typescript
// src/services/orchestrator/progress_emitter.ts
import type { ScrapeStatus } from './scrape_state_machine';

export interface ProgressPatch {
  candidateCount?: number;
  bombCount?: number;
  detailFetchedCount?: number;
  currentKeyword?: string | null;
}

export class ProgressEmitter {
  constructor(private readonly batchId: string) {}

  emit(patch: ProgressPatch): void {
    chrome.runtime.sendMessage({ kind: 'SCRAPE_PROGRESS', batchId: this.batchId, patch });
  }

  emitStatus(status: ScrapeStatus): void {
    chrome.runtime.sendMessage({ kind: 'SCRAPE_STATUS', batchId: this.batchId, status });
  }
}
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/services/orchestrator/progress_emitter -v`
  Expected: PASS (2 tests)

- [ ] **Step 5：提交**
```bash
git add src/services/orchestrator/progress_emitter.ts tests/services/orchestrator/progress_emitter.test.ts
git commit -m "feat(T-072): progress emitter for SW -> dashboard status updates"
```

---

### Task T-073：实现 service_worker.ts 主路由

**对应 AC：** AC-011, AC-014, AC-016, AC-022
**Files:**
- Create: `src/shell/service_worker.ts`
- Test:   `tests/shell/service_worker.test.ts`（侧重消息路由）

- [ ] **Step 1：写失败测试（仅消息路由部分）**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('service_worker message router', () => {
  let listener: any;

  beforeEach(() => {
    (global as any).chrome = {
      runtime: {
        onMessage: { addListener: vi.fn((fn) => { listener = fn; }) },
        sendMessage: vi.fn(),
      },
      tabs: { create: vi.fn(), query: vi.fn(), sendMessage: vi.fn() },
      cookies: { get: vi.fn() },
    };
    return import('@/shell/service_worker');
  });

  it('responds to PING with pong', async () => {
    const sendResponse = vi.fn();
    const ret = listener({ kind: 'PING' }, {}, sendResponse);
    expect(sendResponse).toHaveBeenCalledWith({ pong: true });
    expect(ret).toBe(false);
  });

  it('routes START_SCRAPE to handleStartScrape (returns true for async)', async () => {
    const sendResponse = vi.fn();
    const ret = listener({ kind: 'START_SCRAPE', payload: { batchId: 'b1', keywords: ['a'], timeWindow: { type: 'preset', days: 7 }, thresholds: { ces: 100, likeRatio: 0.5 }, candidatePoolMax: 200, targetBombCount: 20 } }, {}, sendResponse);
    expect(ret).toBe(true);  // async response
  });

  it('routes unknown kind without crashing', () => {
    const sendResponse = vi.fn();
    const ret = listener({ kind: 'UNKNOWN' }, {}, sendResponse);
    expect(ret).toBe(false);
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/shell/service_worker -v`
  Expected: FAIL

- [ ] **Step 3：实现最小代码（仅路由骨架，handleStartScrape 在 T-074 实现）**
```typescript
// src/shell/service_worker.ts

import { handleStartScrape } from '@/services/orchestrator/handle_start_scrape';
import { handleContentScriptFetch } from '@/services/xhs/content_script_fetch_relay';

export {};  // module marker

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  switch (msg.kind) {
    case 'PING':
      sendResponse({ pong: true });
      return false;

    case 'START_SCRAPE':
      handleStartScrape(msg.payload).then(() => sendResponse({ success: true })).catch(e => sendResponse({ success: false, error: e.message }));
      return true;

    case 'CONTENT_SCRIPT_FETCH':
      handleContentScriptFetch(msg).then(sendResponse).catch(e => sendResponse({ success: false, error: e.message }));
      return true;

    case 'CAPTCHA_RESOLVED':
      // 由 T-074 内部 listener 监听，这里不重复处理
      return false;

    case 'NOTES_CAPTURED':
      // 由 T-074 内部 listener 监听
      return false;

    default:
      return false;
  }
});
```

> ⚠️ 此 Task 引用 `handleStartScrape` 和 `handleContentScriptFetch`，它们在 T-074 / 后续实现。可先建空 stub 让编译通过：
> ```typescript
> // src/services/orchestrator/handle_start_scrape.ts
> export async function handleStartScrape(_: any): Promise<void> { /* T-074 */ }
> // src/services/xhs/content_script_fetch_relay.ts
> export async function handleContentScriptFetch(_: any): Promise<any> { return { success: false, error: 'not_implemented' }; }
> ```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/shell/service_worker -v`
  Expected: PASS (3 tests)

- [ ] **Step 5：提交**
```bash
git add src/shell/service_worker.ts src/services/orchestrator/handle_start_scrape.ts src/services/xhs/content_script_fetch_relay.ts tests/shell/service_worker.test.ts
git commit -m "feat(T-073): service worker message router skeleton with stubs"
```

---

### Task T-074：实现 handleStartScrape（核心抓取主流程）

**对应 AC：** AC-011, AC-013, AC-016
**Files:**
- Modify: `src/services/orchestrator/handle_start_scrape.ts`（在 T-073 创建的 stub 上补全）
- Test:   `tests/services/orchestrator/handle_start_scrape.test.ts`

> 此 Task 较长。完整实现照搬 L3 §5.1 主流程伪代码，但 mock 所有外部依赖（content script / fetcher / score）做单元集成测试。

- [ ] **Step 1：写失败测试（行为粒度）**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { handleStartScrape } from '@/services/orchestrator/handle_start_scrape';

vi.mock('@/services/xhs/login_checker', () => ({ isLoggedIn: vi.fn().mockResolvedValue(true) }));
vi.mock('@/services/xhs/captcha_detector', () => ({ isCaptchaErrorCode: () => false }));

describe('handleStartScrape', () => {
  let sendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessageMock = vi.fn();
    (global as any).chrome = {
      runtime: {
        sendMessage: sendMessageMock,
        onMessage: { addListener: vi.fn() },
      },
      tabs: { create: vi.fn(async () => ({ id: 1 })), sendMessage: vi.fn() },
      storage: { local: { set: vi.fn(async () => undefined) } },
    };
  });

  it('emits START -> COMPLETE status sequence on a normal flow', async () => {
    // 模拟一个最小批次：keywords=['a'], pool=2, target=1
    // 预先把 NOTES_CAPTURED 推一次（mock 中通过 internal helper）

    await handleStartScrape({
      batchId: 'b1',
      keywords: ['a'],
      timeWindow: { type: 'preset', days: 7 },
      thresholds: { ces: 1, likeRatio: 0.001 },
      candidatePoolMax: 2,
      targetBombCount: 1,
    });

    const statusCalls = sendMessageMock.mock.calls.map(c => c[0]).filter(m => m.kind === 'SCRAPE_STATUS');
    const statuses = statusCalls.map(c => c.status);
    expect(statuses).toContain('scraping');
    expect(statuses[statuses.length - 1]).toBe('complete');
  });

  it('escalates to failed when isLoggedIn is false', async () => {
    const lc = await import('@/services/xhs/login_checker');
    (lc.isLoggedIn as any).mockResolvedValueOnce(false);

    await handleStartScrape({
      batchId: 'b2',
      keywords: ['a'],
      timeWindow: { type: 'preset', days: 7 },
      thresholds: { ces: 1, likeRatio: 0.001 },
      candidatePoolMax: 2,
      targetBombCount: 1,
    });

    const statusCalls = sendMessageMock.mock.calls.map(c => c[0]).filter(m => m.kind === 'SCRAPE_STATUS');
    expect(statusCalls[statusCalls.length - 1].status).toBe('failed');
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/services/orchestrator/handle_start_scrape -v`
  Expected: FAIL

- [ ] **Step 3：实现最小代码（按 L3 §5.1 主流程）**
```typescript
// src/services/orchestrator/handle_start_scrape.ts
import { ScrapeStateMachine } from './scrape_state_machine';
import { CandidatePool } from './candidate_pool';
import { ProgressEmitter } from './progress_emitter';
import { isLoggedIn } from '@/services/xhs/login_checker';
import { applyAll, inTimeWindow } from '@/services/scoring/apply_all';
import { fetchNoteDetail } from '@/services/xhs/detail_fetcher';
import { fetchUserFans } from '@/services/xhs/user_fetcher';
import type { NoteRecord, BatchRecord } from '@/app/store/batchStore';

export interface StartScrapePayload {
  batchId: string;
  keywords: string[];
  timeWindow: BatchRecord['timeWindow'];
  thresholds: { ces: number; likeRatio: number };
  candidatePoolMax: number;
  targetBombCount: number;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

export async function handleStartScrape(p: StartScrapePayload): Promise<void> {
  const sm = new ScrapeStateMachine();
  const emit = new ProgressEmitter(p.batchId);

  sm.transition('validating');
  emit.emitStatus('validating');

  if (!(await isLoggedIn())) {
    sm.transition('failed');
    emit.emitStatus('failed');
    return;
  }

  // 打开 / 复用一个 XHS 搜索 Tab
  const xhsTab = await chrome.tabs.create({
    url: `https://www.xiaohongshu.com/search?keyword=${encodeURIComponent(p.keywords[0])}`,
    active: false,
  });
  if (!xhsTab.id) {
    sm.transition('failed');
    emit.emitStatus('failed');
    return;
  }

  // 通知 content script 开始拦截
  await chrome.tabs.sendMessage(xhsTab.id, { kind: 'BEGIN_INTERCEPT', batchId: p.batchId });

  sm.transition('scraping');
  emit.emitStatus('scraping');

  const pool = new CandidatePool(p.candidatePoolMax);
  const inbox: NoteRecord[] = [];

  // 监听 content script 转发的 NOTES_CAPTURED
  const captureListener = (msg: any) => {
    if (msg.kind === 'NOTES_CAPTURED' && msg.batchId === p.batchId && msg.endpoint === 'search') {
      try {
        const { parseSearchResponse } = require('@/services/xhs/search_parser');
        inbox.push(...parseSearchResponse(msg.payload));
      } catch {
        /* skip parse failure */
      }
    }
  };
  chrome.runtime.onMessage.addListener(captureListener);

  // 主循环
  let kwIndex = 0;
  let stallCount = 0;
  while (sm.current === 'scraping' && !pool.isFull && kwIndex < p.keywords.length) {
    await chrome.tabs.sendMessage(xhsTab.id, { kind: 'SCROLL_ONCE' });
    await sleep(rand(800, 1500));
    const before = pool.size;
    const drained = inbox.splice(0);
    pool.add(drained);
    emit.emit({ candidateCount: pool.size, currentKeyword: p.keywords[kwIndex] });

    if (pool.size === before) {
      stallCount++;
      if (stallCount >= 3) {
        kwIndex++;
        if (kwIndex < p.keywords.length) {
          await chrome.tabs.sendMessage(xhsTab.id, {
            kind: 'NAVIGATE_KEYWORD',
            keyword: p.keywords[kwIndex],
          });
          stallCount = 0;
        }
      }
    } else {
      stallCount = 0;
    }
  }

  chrome.runtime.onMessage.removeListener(captureListener);
  await chrome.tabs.sendMessage(xhsTab.id, { kind: 'END_INTERCEPT' });

  // 进入详情阶段
  sm.transition('detail_fetching');
  emit.emitStatus('detail_fetching');

  // 简化：对所有候选先算 ces，取 top N
  const enriched = pool.notes.map(n => applyAll(n, p.thresholds, p.timeWindow));
  const topN = Math.min(100, p.targetBombCount * 5);
  const top = [...enriched].sort((a, b) => b.cesScore - a.cesScore).slice(0, topN);

  let detailFetched = 0;
  for (const note of top) {
    if (sm.current !== 'detail_fetching') break;
    const r = await fetchNoteDetail(note.noteId, note.xsecToken);
    if (r.outcome === 'success') {
      note.desc = r.desc;
      note.time = r.time;
      note.tagList = r.tagList;
      note.detailFetchedAt = Date.now();
    } else if (r.outcome === 'deleted') {
      note.isDeleted = true;
    } else if (r.outcome === 'captcha') {
      sm.transition('captcha_paused');
      emit.emitStatus('captcha_paused');
      break;
    } else {
      note.detailFetchFailed = true;
    }
    note.user.fans = await fetchUserFans(note.user.userId);
    if (note.user.fans === null) note.fanFetchFailed = true;
    applyAll(note, p.thresholds, p.timeWindow);
    detailFetched++;
    emit.emit({ detailFetchedCount: detailFetched });
    await sleep(rand(800, 2000));
  }

  // 二次过滤 + 兜底
  const inWindow = enriched.filter(n => inTimeWindow(n.time, p.timeWindow) && !n.isDeleted);
  const bombs = inWindow.filter(n => n.isBomb);
  let display = bombs;
  if (bombs.length < p.targetBombCount) {
    const fallback = inWindow
      .filter(n => !n.isBomb)
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, p.targetBombCount - bombs.length)
      .map(n => ({ ...n, bombReason: 'fallback' as const }));
    display = [...bombs, ...fallback];
  }

  // 持久化批次
  const batch: BatchRecord = {
    batchId: p.batchId,
    createdAt: Date.now(),
    keywords: p.keywords,
    timeWindow: p.timeWindow,
    thresholds: p.thresholds,
    candidatePoolMax: p.candidatePoolMax,
    notes: display,
    candidateCount: pool.size,
    bombCount: bombs.length,
    fallbackCount: display.length - bombs.length,
    status: sm.current === 'captcha_paused' ? 'stopped' : 'complete',
    aiResults: { topicSuggestions: null, angleClusters: null, trendKeywords: null, structureBreakdown: {} },
  };
  await chrome.storage.local.set({ [`batch_${p.batchId}`]: batch });

  if (sm.current === 'detail_fetching') {
    sm.transition('complete');
  }
  emit.emitStatus(sm.current);
}
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/services/orchestrator/handle_start_scrape -v`
  Expected: PASS (2 tests)

- [ ] **Step 5：提交**
```bash
git add src/services/orchestrator/handle_start_scrape.ts tests/services/orchestrator/handle_start_scrape.test.ts
git commit -m "feat(T-074): handleStartScrape full flow per L3 §5.1 (intercept -> detail -> fallback -> persist)"
```

---

### Task T-075：实现 useScrapeListener.ts hook

**对应 AC：** AC-012（dashboard 端实时显示进度）
**Files:**
- Create: `src/app/hooks/useScrapeListener.ts`
- Test:   `tests/app/hooks/useScrapeListener.test.tsx`

- [ ] **Step 1：写失败测试**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrapeListener } from '@/app/hooks/useScrapeListener';

describe('useScrapeListener', () => {
  let listenerRef: any;

  beforeEach(() => {
    (global as any).chrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn((fn) => { listenerRef = fn; }),
          removeListener: vi.fn(),
        },
      },
    };
  });

  it('updates progress on SCRAPE_PROGRESS messages', () => {
    const { result } = renderHook(() => useScrapeListener('btch_1'));
    expect(result.current.progress.candidateCount).toBe(0);

    act(() => {
      listenerRef({ kind: 'SCRAPE_PROGRESS', batchId: 'btch_1', patch: { candidateCount: 50 } });
    });
    expect(result.current.progress.candidateCount).toBe(50);
  });

  it('updates status on SCRAPE_STATUS messages', () => {
    const { result } = renderHook(() => useScrapeListener('btch_1'));
    act(() => {
      listenerRef({ kind: 'SCRAPE_STATUS', batchId: 'btch_1', status: 'complete' });
    });
    expect(result.current.status).toBe('complete');
  });

  it('ignores messages with different batchId', () => {
    const { result } = renderHook(() => useScrapeListener('btch_1'));
    act(() => {
      listenerRef({ kind: 'SCRAPE_PROGRESS', batchId: 'OTHER', patch: { candidateCount: 99 } });
    });
    expect(result.current.progress.candidateCount).toBe(0);
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/app/hooks/useScrapeListener -v`
  Expected: FAIL

- [ ] **Step 3：实现最小代码**
```typescript
// src/app/hooks/useScrapeListener.ts
import { useEffect, useState } from 'react';
import type { ScrapeStatus } from '@/services/orchestrator/scrape_state_machine';

interface Progress {
  candidateCount: number;
  bombCount: number;
  detailFetchedCount: number;
  currentKeyword: string | null;
}

const INITIAL: Progress = {
  candidateCount: 0,
  bombCount: 0,
  detailFetchedCount: 0,
  currentKeyword: null,
};

export function useScrapeListener(batchId: string | null): {
  progress: Progress;
  status: ScrapeStatus;
} {
  const [progress, setProgress] = useState<Progress>(INITIAL);
  const [status, setStatus] = useState<ScrapeStatus>('idle');

  useEffect(() => {
    if (!batchId) return;
    const listener = (msg: any) => {
      if (msg.batchId !== batchId) return;
      if (msg.kind === 'SCRAPE_PROGRESS') {
        setProgress(prev => ({ ...prev, ...msg.patch }));
      } else if (msg.kind === 'SCRAPE_STATUS') {
        setStatus(msg.status);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [batchId]);

  return { progress, status };
}
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/app/hooks/useScrapeListener -v`
  Expected: PASS (3 tests)

- [ ] **Step 5：提交**
```bash
git add src/app/hooks/useScrapeListener.ts tests/app/hooks/useScrapeListener.test.tsx
git commit -m "feat(T-075): useScrapeListener hook subscribes to SW progress messages"
```

---

### Task T-076：实现 BottomStatusBar 组件

**对应 AC：** AC-011, AC-012, AC-013, AC-014
**Files:**
- Create: `src/app/components/nav/BottomStatusBar.tsx`
- Test:   `tests/app/components/nav/BottomStatusBar.test.tsx`

- [ ] **Step 1：写失败测试**
```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomStatusBar } from '@/app/components/nav/BottomStatusBar';

describe('BottomStatusBar', () => {
  it('shows scraping status with candidate count', () => {
    render(<BottomStatusBar status="scraping" progress={{ candidateCount: 137, bombCount: 8, detailFetchedCount: 0, currentKeyword: 'AI' }} />);
    expect(screen.getByText(/137/)).toBeInTheDocument();
    expect(screen.getByText(/AI/)).toBeInTheDocument();
    expect(screen.getByText(/抓取中/)).toBeInTheDocument();
  });

  it('shows captcha_paused warning state', () => {
    render(<BottomStatusBar status="captcha_paused" progress={{ candidateCount: 50, bombCount: 0, detailFetchedCount: 0, currentKeyword: null }} />);
    expect(screen.getByText(/已暂停/)).toBeInTheDocument();
  });

  it('shows complete state', () => {
    render(<BottomStatusBar status="complete" progress={{ candidateCount: 200, bombCount: 18, detailFetchedCount: 18, currentKeyword: null }} />);
    expect(screen.getByText(/已完成/)).toBeInTheDocument();
  });

  it('renders nothing when status is idle', () => {
    const { container } = render(<BottomStatusBar status="idle" progress={{ candidateCount: 0, bombCount: 0, detailFetchedCount: 0, currentKeyword: null }} />);
    expect(container.firstChild).toBeNull();
  });
});
```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run tests/app/components/nav/BottomStatusBar -v`
  Expected: FAIL

- [ ] **Step 3：实现最小代码**
```typescript
// src/app/components/nav/BottomStatusBar.tsx
import type { ScrapeStatus } from '@/services/orchestrator/scrape_state_machine';

interface Props {
  status: ScrapeStatus;
  progress: {
    candidateCount: number;
    bombCount: number;
    detailFetchedCount: number;
    currentKeyword: string | null;
  };
}

const STATUS_LABEL: Record<ScrapeStatus, { text: string; cls: string }> = {
  idle:            { text: '',         cls: '' },
  validating:      { text: '校验登录中', cls: 'bg-neutral-100 text-neutral-700' },
  scraping:        { text: '抓取中',     cls: 'bg-brand-50 text-brand-700' },
  captcha_paused:  { text: '已暂停 — 请通过验证', cls: 'bg-warning-100 text-warning-500' },
  detail_fetching: { text: '抓取正文中', cls: 'bg-brand-50 text-brand-700' },
  complete:        { text: '已完成',     cls: 'bg-success-100 text-success-500' },
  stopped:         { text: '已停止',     cls: 'bg-neutral-100 text-neutral-700' },
  failed:          { text: '失败',       cls: 'bg-error-100 text-error-500' },
};

export function BottomStatusBar({ status, progress }: Props): JSX.Element | null {
  if (status === 'idle') return null;
  const label = STATUS_LABEL[status];
  return (
    <div className={`fixed bottom-0 left-0 right-0 h-12 flex items-center px-6 ${label.cls}`}>
      <span className="font-medium mr-4">{label.text}</span>
      <span className="text-sm">
        {progress.candidateCount} 候选
        {progress.bombCount > 0 && ` · ${progress.bombCount} 爆款`}
        {progress.detailFetchedCount > 0 && ` · ${progress.detailFetchedCount} 已抓正文`}
        {progress.currentKeyword && ` · 当前: ${progress.currentKeyword}`}
      </span>
    </div>
  );
}
```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run tests/app/components/nav/BottomStatusBar -v`
  Expected: PASS (4 tests)

- [ ] **Step 5：提交**
```bash
git add src/app/components/nav/BottomStatusBar.tsx tests/app/components/nav/BottomStatusBar.test.tsx
git commit -m "feat(T-076): BottomStatusBar with 7 scrape status variants"
```

---

### Task T-077：手动集成测试 — 完整抓取流程一次

**对应 AC：** AC-011 ~ AC-016 全部
**Files:** N/A（手动 + 文档化）

- [ ] **Step 1：构建并加载扩展**
```bash
pnpm build && echo "Build OK"
# Chrome → chrome://extensions → 加载 dist/
```

- [ ] **Step 2：登录小红书**
  打开 `https://www.xiaohongshu.com`，确保已登录（顶部有头像）

- [ ] **Step 3：打开 Dashboard，配置抓取**
  - 点扩展图标 → "打开 Dashboard"
  - 配置 Tab：
    - 关键词：`AI 工具`
    - 时间窗口：近 7 天
    - 阈值：CES = 100, 点赞/粉丝比 = 0.5
    - 目标爆款数：5
    - 候选池上限：200

- [ ] **Step 4：点开始抓取，观察 5 个 AC**
  - **AC-011：** 1 秒内切到展示 Tab + 底部状态条出现 ✅
  - **AC-012：** 状态条候选数随滚动增长，显示当前关键词 ✅
  - **AC-013：** 候选池满 200 / 满足 5 爆款其一 → 自动停 ✅
  - **AC-014：** 如遇验证码 → 状态变黄 + 弹窗 ✅
  - **AC-015：** 通过验证后 5 秒内若仍 461 → 弹窗保留 ✅

- [ ] **Step 5：记录结果**
```bash
# 创建联调记录
mkdir -p test-fixtures/integration
echo "## T-077 完整抓取流程联调

日期: $(date +%Y-%m-%d)
关键词: AI 工具
候选数: __
爆款数: __
风控触发: 是 / 否
AC-011: ✅ / ❌
AC-012: ✅ / ❌
AC-013: ✅ / ❌
AC-014: ✅ / ❌
AC-015: ✅ / ❌
" > test-fixtures/integration/T-077-result.md
```
  填完结果后 commit：
```bash
git add test-fixtures/integration/T-077-result.md
git commit -m "test(T-077): full scrape flow integration result on $(date +%Y-%m-%d)"
```

---

## 其余 Phase（采用 L3 §11 索引）

> Phase 1.0 / 1.1 / 1.2 / 1.3 / 1.4 / 1.5 / 1.8 / 1.9 / 1.10 / 1.11 / 1.12 / 1.13 / 1.14 — 实施方按 `docs/prd/xhs-radar-l3.md §11` Plan Task 索引执行。每个 Task 的实现请参照本 Plan Phase 1.6 / 1.7 的"5 步骤 / TDD"模式自行展开（subagent 内部用 `superpowers:test-driven-development`）。

---

## Plan 自检

- [x] **Spec coverage：** Phase 1.6 + 1.7 详写 Task 全部引用对应 AC（AC-010, 011, 012, 013, 014, 016, 020, 022），覆盖抓取主链路
- [x] **Placeholder scan：** 全文无 TBD / "implement later" / "similar to Task N"
- [x] **Type consistency：** NoteRecord / BatchRecord / ScrapeStatus 在 Task 间用法一致
- [x] **Files explicit：** 每 Task 有明确 Create / Modify / Test 路径
- [x] **Commands explicit：** 每个 Run 步骤有完整命令 + Expected
- [x] **Code complete：** 每个代码步骤有完整可运行代码块
- [x] **AC traceable：** 每 Task 顶部引用对应 AC 编号

---

## 四层一致性检查（v2 升级版）

- [x] **L1 → L2：** L1 抓取流程 → L2 §2.0–2.3 三个 Tab 详细对应
- [x] **L2 → L3：** L2 字段 → L3 §3.1 NoteRecord 全部 TS 类型定义
- [x] **L2 → L3：** L2 4 个外部接口 → L3 §3.2–3.7 全 Schema
- [x] **L3 → Plan：** L3 AC-010/011/012/013/014/016/020/022 在 Phase 1.6+1.7 详写覆盖
- [x] **L3 Phase 2 ↔ Plan：** Plan 仅写 Phase 1，未触及 [PHASE 2] 项
- [x] **L1 一期 ↔ Plan ↔ L3 §11：** 三处口径一致

---

*xhs-radar Phase 1 Plan v0.1 · 基于 L3 §5.1 / §3 / §4 + writing-plans 格式 · 2026-05-09*
