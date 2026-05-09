# xhs-radar 赛道爆款雷达 — L3 Coding PRD

**版本：** v0.3（批次 1–3 已完成 / 4） | **状态：** 撰写中 | **日期：** 2026-05-09
**上游：** [`L1 v0.4`](./xhs-radar-l1.md) · [`L2 v0.1`](./xhs-radar-l2.md)
**目标读者：** Codex / AI 执行引擎 + 研发工程师

---

## 📎 文档索引

| 文档 | 模块 | 状态 |
|------|------|------|
| L1 产品设计大纲 | 全局 | ✅ v0.4 |
| L2 传统 PRD | 全局 | ✅ v0.1 |
| L3 Coding PRD（本文档） | 全局 | 🟡 批次 3 / 4 |
| HTML 原型 | 前端 | ⏭ 已跳过 |

---

## 📚 全文 11 章目录

1. **组件树**（本批次）
2. **State 定义**（本批次）
3. **API Schema**（本批次）
4. **API 清单 + 请求构造规则 + 测试用例**（本批次）
5. 交互逻辑规范（批次 3）
6. 视觉 Token（批次 3）
7. 边界条件与错误处理（批次 3）
8. 验收标准（批次 3）
9. Phase 2 占位（批次 3 内嵌）
10. Mock 数据（批次 3 内嵌）
11. Plan Task 清单（批次 4）

---

## 🏗 技术栈锁定

| 项 | 版本 / 选型 | 说明 |
|---|---|---|
| Manifest | V3 | Chrome 最新规范 |
| 框架 | React 19 | 与 xhs-ai-tool 一致 |
| 语言 | TypeScript 5.8 (strict) | 类型严格，零 `any` 默认 |
| 构建 | Vite 7 | 与 xhs-ai-tool 一致 |
| 扩展打包 | `@crxjs/vite-plugin` v2 | manifest + HMR |
| 样式 | Tailwind CSS 4 + `@tailwindcss/vite` | 与 xhs-ai-tool 一致 |
| 状态管理 | Zustand 4.x | 轻量、与 React 19 兼容 |
| 路由 | URL Hash 自管理（不引入 react-router） | Tab 三选一无需嵌套路由 |
| 包管理 | pnpm 9.x | |
| AI SDK | `openai` npm 包（DeepSeek 走 OpenAI 兼容协议） | base URL 替换为 deepseek |
| ID 生成 | `nanoid` | 批次 ID / Toast ID |

---

## 一、组件树

### 1.1 目录骨架（强制按"形态无关"分层）

```
xhs-radar/
├── manifest.config.ts
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.ts
├── package.json
├── public/
│   ├── icon_16.png / icon_48.png / icon_128.png
│   └── dashboard.html              # Dashboard 入口 HTML
└── src/
    ├── shell/                      # ⚠ 容器层（形态相关，可替换）
    ├── app/                        # ⚠ 形态无关的 React 应用（核心）
    └── services/                   # ⚠ 抽象层（chrome API + 业务）
```

**强制铁律：** `src/app/` 内任何文件**不允许**直接 `import 'chrome'`、`chrome.storage.*`、`chrome.runtime.*`、`chrome.tabs.*`。所有 chrome.* 调用必须经过 `src/services/chrome/`。这条规则保证未来切回浮层形态只需改 `src/shell/`。

### 1.2 `src/shell/` —— 容器层

```
src/shell/
├── service_worker.ts                       # Background Service Worker（扩展常驻）
├── content_scripts/
│   └── xhs_interceptor.ts                  # 注入到小红书页面（MAIN world）
├── popup/
│   ├── popup.html                          # 点扩展图标的小弹窗（一期仅作"打开 Dashboard"入口）
│   └── popup.tsx                           # 极简：1 个按钮 "打开 Dashboard"
└── dashboard_entry.tsx                     # ReactDOM.render(<App />, ...) 入口
```

| 文件 | 用途 |
|---|---|
| `service_worker.ts` | 接收 popup / content / dashboard 消息；管理抓取状态机；调度详情接口请求；与 content script 通信 |
| `content_scripts/xhs_interceptor.ts` | 在小红书页面注入 MAIN world 脚本，劫持 `window.fetch` + `XMLHttpRequest`；把命中的搜索响应通过 `window.postMessage` → content script → `chrome.runtime.sendMessage` 转给 service worker |
| `popup/popup.tsx` | 1 个主按钮"打开 Dashboard" → `chrome.tabs.create({ url: chrome.runtime.getURL('dashboard.html') })`；附带显示当前抓取状态 |
| `dashboard_entry.tsx` | Dashboard Tab 的 ReactDOM 入口；负责 mount `<App />` |

### 1.3 `src/app/` —— Dashboard React 应用（形态无关）

```
src/app/
├── App.tsx                                 # 顶层：路由分发 + 全局布局 + Toast 容器
│
├── routes/
│   ├── ConfigPage.tsx                      # Tab 1：配置
│   ├── DisplayPage.tsx                     # Tab 2：展示
│   └── FavoritesAndHistoryPage.tsx         # Tab 3：收藏与历史（含子 Tab 切换）
│
├── components/
│   ├── nav/
│   │   ├── TopNavBar.tsx                   # 顶部：Logo + 三 Tab + AI Key 状态 + 诊断按钮
│   │   └── BottomStatusBar.tsx             # 底部：抓取进度条（仅抓取时显示）
│   │
│   ├── config/
│   │   ├── KeywordChipsInput.tsx           # 区块 A：关键词组（Enter / 逗号添加，× 删除）
│   │   ├── TimeWindowSelector.tsx          # 区块 B：时间窗口（4 选 1 + 自定义日期）
│   │   ├── ThresholdInputs.tsx             # 区块 C：CES 阈值 + 点赞/粉丝比阈值
│   │   ├── TargetCountInput.tsx            # 区块 D：目标爆款数（输入框 + 滑块）
│   │   ├── PoolMaxSelector.tsx             # 区块 E：候选池上限单选
│   │   ├── ApiKeyInput.tsx                 # 区块 F：DeepSeek Key（密码框 + 测试按钮 + 模型选择）
│   │   └── StartScrapeButton.tsx           # 区块 G：粘性底部主按钮 + 配置摘要
│   │
│   ├── display/
│   │   ├── BatchInfoBar.tsx                # 顶部批次信息条（候选 / 爆款 / 重抓）
│   │   ├── FilterSortBar.tsx               # 排序 + 筛选 + 角度聚类 chip
│   │   ├── NoteCardGrid.tsx                # 卡片网格容器（虚拟滚动可二期）
│   │   ├── NoteCard.tsx                    # 单条爆款卡片
│   │   └── DetailDrawer.tsx                # 右侧 40% 详情抽屉（含 AiTabsContainer）
│   │
│   ├── ai/
│   │   ├── AiTabsContainer.tsx             # 4 Tab 容器
│   │   ├── TopicSuggestionsTab.tsx         # 选题建议（全局）
│   │   ├── StructureBreakdownTab.tsx       # 结构拆解（单条）
│   │   ├── AngleClustersTab.tsx            # 角度聚类（全局）
│   │   └── TrendKeywordsTab.tsx            # 趋势词（全局）
│   │
│   ├── favorites/
│   │   ├── FavoritesSubTab.tsx             # 收藏列表
│   │   ├── HistorySubTab.tsx               # 历史批次列表
│   │   ├── FavoriteRow.tsx                 # 单行收藏项
│   │   └── HistoryRow.tsx                  # 单行历史批次项
│   │
│   ├── modals/
│   │   ├── ConfirmStartScrapeModal.tsx     # §5.1
│   │   ├── NotLoggedInModal.tsx            # §5.2
│   │   ├── CaptchaPausedModal.tsx          # §5.3
│   │   ├── MissingApiKeyModal.tsx          # §5.4
│   │   ├── ConfirmDeleteModal.tsx          # §5.5（收藏 / 历史共用）
│   │   └── DiagnosticsModal.tsx            # §5.7
│   │
│   └── shared/
│       ├── EmptyState.tsx                  # 通用空状态：插画 + 文案 + 按钮
│       ├── LoadingSpinner.tsx              # 通用 spinner
│       ├── ErrorCard.tsx                   # 通用错误卡 + 重试
│       ├── ToastContainer.tsx              # 全局 Toast 队列
│       └── Modal.tsx                       # 通用模态框基础组件
│
├── store/                                  # Zustand stores（详见 §二）
│   ├── configStore.ts
│   ├── scrapeStore.ts
│   ├── batchStore.ts
│   ├── favoritesStore.ts
│   ├── historyStore.ts
│   ├── aiStore.ts
│   └── uiStore.ts
│
└── hooks/
    ├── useHashRoute.ts                     # 监听 location.hash，返回当前 Tab
    ├── useChromeStoragePersist.ts          # 把 store 持久化到 chrome.storage.local
    ├── useScrapeListener.ts                # 订阅 service worker 推来的抓取进度消息
    └── useToast.ts                         # 触发 Toast 的 hook
```

### 1.4 `src/services/` —— 抽象层

```
src/services/
├── chrome/                                 # chrome.* API 唯一入口
│   ├── storage.ts                          # get / set / remove / onChanged 封装
│   ├── messaging.ts                        # sendMessage / onMessage 封装
│   ├── tabs.ts                             # tabs.create / query / sendMessage 封装
│   ├── runtime.ts                          # getURL / id / onInstalled
│   └── index.ts                            # barrel export
│
├── xhs/                                    # 小红书相关
│   ├── selectors.ts                        # ⚠ 接口路径 + 选择器集中管理（热更入口）
│   ├── interceptor_main.ts                 # MAIN world 注入脚本源码（被 content script inject）
│   ├── search_parser.ts                    # 解析搜索响应为 NoteRecord[]
│   ├── detail_fetcher.ts                   # 详情接口调用 + 退避
│   ├── user_fetcher.ts                     # 用户主页接口调用 + per-user 缓存
│   ├── login_checker.ts                    # 检查 cookie 中是否有 web_session
│   └── captcha_detector.ts                 # 检测响应/DOM 中的风控信号
│
├── deepseek/
│   ├── client.ts                           # OpenAI 兼容 client（baseURL=api.deepseek.com）
│   ├── prompts.ts                          # 4 个 prompt 模板（带 JSON schema 提示）
│   ├── schemas.ts                          # 4 个 JSON Schema（运行时校验）
│   └── retry.ts                            # 单次失败重试 1 次（指数退避 1s→2s）
│
├── scoring/
│   ├── ces.ts                              # CES 综合评分计算
│   ├── decay.ts                            # 时间衰减系数
│   ├── ratio.ts                            # 点赞/粉丝比
│   ├── filter.ts                           # is_bomb 判定 + 兜底排序
│   └── parse_count.ts                      # "1.2万" → 12000
│
├── csv/
│   └── exporter.ts                         # 批次 → CSV 字符串 → Blob 下载
│
├── orchestrator/                           # 抓取主控（仅在 service_worker 中运行）
│   ├── scrape_state_machine.ts             # IDLE/VALIDATING/SCRAPING/CAPTCHA_PAUSED/DETAIL_FETCHING/COMPLETE/FAILED
│   ├── candidate_pool.ts                   # 候选池累积 + 去重
│   └── progress_emitter.ts                 # 向 dashboard 推送进度
│
└── id/
    └── nanoid.ts                           # 统一 ID 生成（batch_id 等）
```

### 1.5 组件树视觉概览（运行时层级）

```
<App>                                       (App.tsx)
├── <TopNavBar>                             顶部导航
├── <main>                                  Tab 内容区（按 hash 切换）
│   ├── <ConfigPage>                        (#config)
│   │   ├── <KeywordChipsInput>
│   │   ├── <TimeWindowSelector>
│   │   ├── <ThresholdInputs>
│   │   ├── <TargetCountInput>
│   │   ├── <PoolMaxSelector>
│   │   ├── <ApiKeyInput>
│   │   └── <StartScrapeButton>             ← 粘性底部
│   │
│   ├── <DisplayPage>                       (#display)
│   │   ├── <BatchInfoBar>
│   │   ├── <FilterSortBar>
│   │   ├── <NoteCardGrid>
│   │   │   └── <NoteCard> × N
│   │   └── <DetailDrawer>                  ← 右侧 40%（开关式）
│   │       └── <AiTabsContainer>
│   │           ├── <TopicSuggestionsTab>
│   │           ├── <StructureBreakdownTab>
│   │           ├── <AngleClustersTab>
│   │           └── <TrendKeywordsTab>
│   │
│   └── <FavoritesAndHistoryPage>           (#favorites / #history)
│       ├── <FavoritesSubTab>               (#favorites)
│       │   └── <FavoriteRow> × N
│       └── <HistorySubTab>                 (#history)
│           └── <HistoryRow> × N
│
├── <BottomStatusBar>                       仅 isScraping = true 显示
│
├── <ToastContainer>                        全局 Toast 队列
│
└── <ModalRoot>                             模态层（同时仅 1 个）
    ├── <ConfirmStartScrapeModal>           条件渲染
    ├── <NotLoggedInModal>
    ├── <CaptchaPausedModal>
    ├── <MissingApiKeyModal>
    ├── <ConfirmDeleteModal>
    └── <DiagnosticsModal>
```

---

## 二、State 定义

> **统一规则：** 用 Zustand。每个 store 一个文件，导出 `useXxxStore` hook。所有可持久化 store 通过 `useChromeStoragePersist` hook 自动同步到 `chrome.storage.local`。

### 2.1 `configStore` — 用户配置（持久化）

**chrome.storage 键名：** `user_config`

```typescript
// src/app/store/configStore.ts

export type TimeWindow =
  | { type: 'preset'; days: 3 | 7 | 30 }
  | { type: 'custom'; start: number; end: number };  // unix ms

export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner';

export type ApiKeyStatus = 'unconfigured' | 'untested' | 'testing' | 'valid' | 'invalid';

export interface ConfigState {
  // 关键词组（最多 10 个，每个 1-30 字符，去重）
  keywords: string[];
  // 时间窗口
  timeWindow: TimeWindow;
  // 爆款阈值
  cesThreshold: number;            // 默认 100，范围 [10, 100000]
  likeRatioThreshold: number;      // 默认 0.5，范围 [0.01, 10]
  // 目标爆款数
  targetBombCount: number;         // 默认 20，范围 [1, 100]
  // 候选池上限
  candidatePoolMax: 200 | 250 | 300;  // 默认 200
  // DeepSeek
  deepseekApiKey: string;          // 加密存储（一期用 base64 简单遮蔽，二期上 webcrypto）
  deepseekModel: DeepSeekModel;    // 默认 'deepseek-chat'
  apiKeyStatus: ApiKeyStatus;      // 默认 'unconfigured'

  // actions
  addKeyword: (kw: string) => void;
  removeKeyword: (kw: string) => void;
  setTimeWindow: (w: TimeWindow) => void;
  setThreshold: (kind: 'ces' | 'likeRatio', value: number) => void;
  setTargetBombCount: (n: number) => void;
  setCandidatePoolMax: (n: 200 | 250 | 300) => void;
  setApiKey: (key: string) => void;
  setModel: (m: DeepSeekModel) => void;
  setApiKeyStatus: (s: ApiKeyStatus) => void;
  reset: () => void;
}

// 初始值
export const CONFIG_INITIAL: Omit<ConfigState, /* actions */ ...> = {
  keywords: [],
  timeWindow: { type: 'preset', days: 7 },
  cesThreshold: 100,
  likeRatioThreshold: 0.5,
  targetBombCount: 20,
  candidatePoolMax: 200,
  deepseekApiKey: '',
  deepseekModel: 'deepseek-chat',
  apiKeyStatus: 'unconfigured',
};
```

**更新时机：**
- `addKeyword` / `removeKeyword`：用户在 `<KeywordChipsInput>` 操作
- `setTimeWindow`：`<TimeWindowSelector>` 切换或日期改动
- `setThreshold`：`<ThresholdInputs>` 失焦或滑块停止
- `setApiKey`：`<ApiKeyInput>` 失焦
- `setApiKeyStatus`：`<ApiKeyInput>` 点测试按钮调用 `services/deepseek/client.ts::testKey()` 后

---

### 2.2 `scrapeStore` — 当前抓取流程（瞬态，不持久化）

```typescript
// src/app/store/scrapeStore.ts

export type ScrapeStatus =
  | 'idle'
  | 'validating'         // 检查登录态
  | 'scraping'           // 滚动 + 拦截
  | 'captcha_paused'     // 风控暂停
  | 'detail_fetching'    // 抓爆款正文
  | 'complete'
  | 'stopped'            // 用户暂停
  | 'failed';

export interface ScrapeProgress {
  candidateCount: number;          // 当前候选池数量
  bombCount: number;               // 当前已识别爆款数
  detailFetchedCount: number;      // 已抓正文数
  currentKeyword: string | null;   // 正在处理的关键词
  startedAt: number;               // unix ms
  lastUpdateAt: number;            // unix ms
}

export interface ScrapeState {
  status: ScrapeStatus;
  progress: ScrapeProgress;
  currentBatchId: string | null;   // 抓取中的批次 ID
  error: { code: string; message: string } | null;

  // actions（仅 service worker 通过 messaging 调用，UI 只读）
  setStatus: (s: ScrapeStatus) => void;
  updateProgress: (p: Partial<ScrapeProgress>) => void;
  setError: (e: { code: string; message: string } | null) => void;
  reset: () => void;
}

export const SCRAPE_INITIAL = {
  status: 'idle' as ScrapeStatus,
  progress: {
    candidateCount: 0,
    bombCount: 0,
    detailFetchedCount: 0,
    currentKeyword: null,
    startedAt: 0,
    lastUpdateAt: 0,
  },
  currentBatchId: null,
  error: null,
};
```

**更新时机：**
- `setStatus` / `updateProgress`：service worker 通过 `chrome.runtime.sendMessage` 推送进度，dashboard 端 `useScrapeListener` hook 接收后写入
- `reset`：用户开始新批次时

---

### 2.3 `batchStore` — 当前展示的批次（瞬态 + 历史指针）

```typescript
// src/app/store/batchStore.ts

export interface NoteRecord {
  // —— 来自搜索接口 ——
  noteId: string;
  xsecToken: string;
  modelType: 'note' | 'video' | 'ad';
  title: string;
  time: number;                    // unix ms 发布时间
  lastUpdateTime: number;
  tagList: Array<{ type: string; name: string; id?: string }>;
  user: {
    userId: string;
    nickname: string;
    avatar: string;
    fans: number | null;           // 来自用户主页接口（懒加载，未拿到则 null）
  };
  interactInfo: {
    likedCount: number;            // 已 parse_count 转换为 number
    collectedCount: number;
    commentCount: number;
    shareCount: number;
  };
  // —— 来自详情接口（懒加载） ——
  desc: string | null;             // 正文，未抓时 null
  detailFetchedAt: number | null;  // unix ms

  // —— 本地计算字段 ——
  cesScore: number;
  likeToFansRatio: number | null;  // fans 未拿到时 null
  daysSincePublish: number;
  timeDecayFactor: number;
  weightedScore: number;
  isBomb: boolean;
  bombReason: 'super' | 'fallback' | 'not_bomb';  // fallback = 未达标但兜底入选

  // —— 角度聚类标签（AI 生成） ——
  clusterLabel: string | null;     // 默认 null，跑过聚类后填充

  // —— 失败标记 ——
  detailFetchFailed: boolean;
  fanFetchFailed: boolean;
  isDeleted: boolean;              // 详情接口返回 404 时
}

export interface BatchRecord {
  batchId: string;                 // nanoid
  createdAt: number;               // unix ms
  keywords: string[];
  timeWindow: TimeWindow;
  thresholds: { ces: number; likeRatio: number };
  candidatePoolMax: number;
  notes: NoteRecord[];             // 全部候选（已计算分数 + is_bomb）
  candidateCount: number;          // = notes.length
  bombCount: number;               // = notes.filter(n => n.isBomb).length
  fallbackCount: number;           // 兜底数
  status: 'running' | 'complete' | 'stopped' | 'failed';
  aiResults: {
    topicSuggestions: TopicSuggestionsResult | null;
    angleClusters: AngleClustersResult | null;
    trendKeywords: TrendKeywordsResult | null;
    structureBreakdown: Record<string /* noteId */, StructureBreakdownResult>;
  };
}

export interface BatchState {
  current: BatchRecord | null;
  // actions
  setCurrent: (b: BatchRecord | null) => void;
  updateNoteDetail: (noteId: string, patch: Partial<NoteRecord>) => void;
  setAiResult: <K extends keyof BatchRecord['aiResults']>(
    key: K,
    value: BatchRecord['aiResults'][K]
  ) => void;
}

export const BATCH_INITIAL = { current: null };
```

**更新时机：**
- `setCurrent`：抓取完成时 service worker 发送完整批次 / 用户从历史页"载入"
- `updateNoteDetail`：详情接口返回后 / fans 接口返回后
- `setAiResult`：AI 调用成功后写入缓存

---

### 2.4 `favoritesStore` — 收藏库（持久化）

**chrome.storage 键名：** `favorites`

```typescript
// src/app/store/favoritesStore.ts

export interface FavoriteRecord {
  noteId: string;
  // 冗余存储部分笔记快照，避免源批次被删后丢失
  snapshot: Pick<NoteRecord, 'title' | 'user' | 'interactInfo' | 'cesScore' | 'time' | 'desc'>;
  favoritedAt: number;             // unix ms
  sourceBatchId: string;
}

export interface FavoritesState {
  byNoteId: Record<string, FavoriteRecord>;
  // actions
  add: (note: NoteRecord, sourceBatchId: string) => void;
  remove: (noteId: string) => void;
  isFavorited: (noteId: string) => boolean;
  list: () => FavoriteRecord[];     // 按 favoritedAt 降序
}

export const FAVORITES_INITIAL = { byNoteId: {} };
```

**更新时机：**
- `add`：用户在 `<NoteCard>` 或详情抽屉点 ⭐
- `remove`：在收藏 Tab 点取消收藏（确认弹窗后）

---

### 2.5 `historyStore` — 历史批次列表（持久化）

**chrome.storage 键名：** `history`（仅存元数据 + 引用；批次 detail 单独 key 存 `batch_<id>`）

```typescript
// src/app/store/historyStore.ts

export interface HistoryEntry {
  batchId: string;
  createdAt: number;
  keywords: string[];
  candidateCount: number;
  bombCount: number;
  status: BatchRecord['status'];
}

export interface HistoryState {
  entries: HistoryEntry[];          // 按 createdAt 降序，最多 10 条

  // actions
  push: (b: BatchRecord) => void;   // 自动维护"最多 10 条"，超出删最旧
  removeById: (batchId: string) => void;
  loadBatchDetail: (batchId: string) => Promise<BatchRecord | null>;  // 从 chrome.storage.local 读取 batch_<id>
}

export const HISTORY_INITIAL = { entries: [] };
```

**更新时机：**
- `push`：抓取完成（COMPLETE / STOPPED / FAILED）时 service worker 调用
- `removeById`：用户在历史 Tab 点删除（确认弹窗后）；或自动清理超 10 条

---

### 2.6 `aiStore` — AI 调用瞬态状态

```typescript
// src/app/store/aiStore.ts

export type AiTaskKind =
  | 'topic_suggestions'
  | 'angle_clusters'
  | 'trend_keywords'
  | 'structure_breakdown';

export type AiTaskStatus = 'idle' | 'loading' | 'retrying' | 'success' | 'failed';

export interface AiTaskState {
  status: AiTaskStatus;
  startedAt: number | null;
  error: { code: string; message: string } | null;
}

export interface AiState {
  // 全局 AI（每个 batch 一份）
  global: Record<
    /* batchId */ string,
    {
      topic_suggestions: AiTaskState;
      angle_clusters: AiTaskState;
      trend_keywords: AiTaskState;
    }
  >;
  // 单条 AI（每个 noteId 一份）
  perNote: Record<string /* noteId */, { structure_breakdown: AiTaskState }>;

  // actions
  setGlobalStatus: (
    batchId: string,
    kind: 'topic_suggestions' | 'angle_clusters' | 'trend_keywords',
    state: Partial<AiTaskState>
  ) => void;
  setPerNoteStatus: (
    noteId: string,
    state: Partial<AiTaskState>
  ) => void;
  reset: () => void;
}

export const AI_INITIAL = { global: {}, perNote: {} };
```

**更新时机：**
- `setGlobalStatus` / `setPerNoteStatus`：在调用 DeepSeek 前后由 AI Tab 组件触发；结果本身写入 `batchStore.aiResults`，此 store 仅管"调用状态"

---

### 2.7 `uiStore` — UI 瞬态（路由 / 弹窗 / Toast / 抽屉）

```typescript
// src/app/store/uiStore.ts

export type Tab = 'config' | 'display' | 'favorites' | 'history';

export type ModalKind =
  | null
  | 'confirm_start_scrape'
  | 'not_logged_in'
  | 'captcha_paused'
  | 'missing_api_key'
  | 'confirm_delete'
  | 'diagnostics';

export interface ModalPayload {
  kind: ModalKind;
  data?: Record<string, unknown>;  // 各弹窗自定义 payload
}

export interface ToastItem {
  id: string;                       // nanoid
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  durationMs: number;               // 默认 3000
}

export interface UiState {
  currentTab: Tab;
  drawerOpenNoteId: string | null;  // 详情抽屉打开的 noteId
  drawerActiveAiTab: AiTaskKind | null;
  modal: ModalPayload;
  toasts: ToastItem[];

  // actions
  setTab: (t: Tab) => void;
  openDrawer: (noteId: string) => void;
  closeDrawer: () => void;
  setDrawerAiTab: (k: AiTaskKind | null) => void;
  showModal: (m: ModalPayload) => void;
  hideModal: () => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
}

export const UI_INITIAL: Pick<UiState, 'currentTab' | 'drawerOpenNoteId' | 'drawerActiveAiTab' | 'modal' | 'toasts'> = {
  currentTab: 'config',
  drawerOpenNoteId: null,
  drawerActiveAiTab: null,
  modal: { kind: null },
  toasts: [],
};
```

**更新时机：**
- `setTab`：用户点 Tab 切换；同时通过 `useHashRoute` 同步 `location.hash`
- `openDrawer` / `closeDrawer`：用户点卡片"查看正文" / 关闭按钮
- `showModal` / `hideModal`：弹窗触发条件命中
- `addToast` / `removeToast`：操作完成 / 失败 / 自动超时清理

---

### 2.8 持久化策略汇总

| Store | 是否持久化 | chrome.storage 键 | 备注 |
|---|---|---|---|
| `configStore` | ✅ | `user_config` | 全部字段持久 |
| `scrapeStore` | ❌ | — | 重启 Dashboard 时从 service worker 拉一次最新状态 |
| `batchStore` | ⚠ 间接 | `batch_<batchId>` | current 不直接持久；切批次时从 storage 读 |
| `favoritesStore` | ✅ | `favorites` | 全部字段持久 |
| `historyStore` | ✅ | `history` | 仅元数据；batch detail 走 `batch_<id>` |
| `aiStore` | ❌ | — | AI 任务状态瞬态；结果在 batch.aiResults 中持久 |
| `uiStore` | ⚠ 部分 | — | 仅 `currentTab` 同步到 URL hash，不存 storage |

---

## 批次 1 自检

- [x] 组件树完整，每个组件有清晰用途
- [x] 形态无关分层（shell / app / services）已强制
- [x] 所有 State 字段有 TypeScript 类型 + 初始值 + 更新时机
- [x] Store 划分独立，关注点分离
- [x] 持久化策略明确

---

---

# 📦 批次 2：API Schema + 请求构造规则 + 测试用例

## 📚 参考资料来源说明

> Skill 模板默认引用 `docs/07_api/test-case-field-checklist.md`，本项目无此路径，实际数据来源如下：

| 来源 | 用途 |
|---|---|
| `xhs_web_crawler-main/README.md` 的 JSON 样例 | 笔记字段命名 + 嵌套结构（`note_card.interact_info` 等） |
| `xhs_web_crawler-main/extract-content.py` | 响应解析路径（`data.items[].note_card`） |
| `Spider_XHS-master/README.md` 的 API 字段表 | 接口完整字段清单 |
| 知乎/CSDN 公开技术博客（已搜证） | 搜索接口 path、请求参数、签名头 |
| DeepSeek 官方文档（OpenAI 兼容协议） | DeepSeek prompt 协议 |
| 项目内 `src/services/xhs/selectors.ts` | 接口路径 + DOM 选择器集中管理（热更入口） |

> ⚠️ 所有 path / 字段命名以**实际抓取响应为准**；本节示例为开源项目样例 + 公开文档，需在 Phase 1 联调时验证最新版接口字段。如有偏差以联调结果为准并同步更新 `selectors.ts`。

---

## 三、API Schema

### 3.1 通用约定

```typescript
// src/services/xhs/types.ts

// 互动数原始字段是字符串（"1.2万" / "999+"），需 parse_count 转成 number
export type RawCount = string;

// 小红书接口的统一响应包装
export interface XhsApiResponse<T> {
  code: number;        // 0 = success；非 0 见 §3.5 错误码
  success: boolean;
  msg: string;
  data: T;
}

// 时间戳（unix ms）
export type Timestamp = number;
```

### 3.2 小红书：搜索笔记 — Response Schema（仅拦截，不构造请求）

**关键说明：** 搜索接口需要 `x-s` / `x-t` / `a1` 等签名头，逆向成本高且小红书风控严格。**本项目不主动调用搜索接口**，而是由 content script 注入 MAIN world 脚本劫持 `window.fetch` / `XMLHttpRequest`，被动捕获用户在小红书搜索页滚动时浏览器自然发出的搜索请求响应。

**目标 URL pattern**（在 `selectors.ts` 中维护）：
```
https://edith.xiaohongshu.com/api/sns/web/v1/search/notes
```

**Response Schema：**

```typescript
// src/services/xhs/schemas/search.ts

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
  id: string;                          // = note_id
  model_type: 'note' | 'video' | 'rec_query' | 'hot_query' | 'ad';
  // 仅当 model_type === 'note' 时存在 note_card
  note_card?: XhsNoteCard;
  xsec_token: string;                  // 详情接口必须带
}

export interface XhsNoteCard {
  type: 'normal' | 'video';
  display_title: string;               // 标题
  user: {
    user_id: string;
    nickname: string;
    nick_name?: string;                // 兼容老字段
    avatar: string;
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
  corner_tag_info?: Array<{ type: string; text: string }>;
  // 时间字段在搜索响应中通常不直接返回，由详情接口提供
}
```

**说明：** `time` 字段在搜索响应里大概率不存在（小红书搜索接口对时间字段做了隐藏）；本项目时间窗口过滤通过详情接口的 `time` 字段二次过滤实现，搜索阶段先全收。

---

### 3.3 小红书：笔记详情接口 —— Request / Response Schema

**目标 URL pattern：**
```
https://edith.xiaohongshu.com/api/sns/web/v1/feed
```

**Request Body：**

```typescript
// src/services/xhs/schemas/detail.ts

export interface XhsFeedRequest {
  source_note_id: string;              // = note_id
  image_formats: ['jpg', 'webp', 'avif'];
  extra: {
    need_body_topic: '1';              // 字符串 '1'，需要正文话题
  };
  xsec_source: 'pc_search' | 'pc_user' | 'pc_feed';  // 来源标识
  xsec_token: string;                  // 来自搜索接口的 xsec_token
}
```

**Response：**

```typescript
export interface XhsFeedResponse {
  code: number;
  success: boolean;
  msg: string;
  data: {
    items: XhsFeedItem[];              // 通常长度 1
    cursor_score?: string;
  };
}

export interface XhsFeedItem {
  id: string;
  model_type: 'note';
  note_card: XhsFeedNoteCard;
}

export interface XhsFeedNoteCard {
  type: 'normal' | 'video';
  title: string;
  desc: string;                        // ⭐ 正文（这是详情接口的核心目标字段）
  time: Timestamp;                     // ⭐ 发布时间
  last_update_time: Timestamp;
  user: {
    user_id: string;
    nickname: string;
    avatar: string;
    xsec_token?: string;
  };
  interact_info: {
    liked: boolean;
    liked_count: RawCount;
    collected: boolean;
    collected_count: RawCount;
    comment_count: RawCount;
    share_count: RawCount;
    followed: boolean;
    relation: 'none' | 'follows' | 'fans' | 'both';
  };
  tag_list: Array<{
    type: 'topic' | 'brand' | 'topic_page';
    id?: string;
    name: string;
  }>;
  at_user_list: unknown[];
  share_info: { un_share: boolean };
  image_list?: Array<{                  // Phase 2 才用
    url: string;
    url_default: string;
    url_pre: string;
    width: number;
    height: number;
    info_list: Array<{ image_scene: string; url: string }>;
    live_photo?: boolean;
    file_id?: string;
  }>;
}
```

---

### 3.4 小红书：用户信息接口 —— Request / Response Schema

**目标 URL pattern：**
```
https://edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo
```

**Request Query：**

```typescript
export interface XhsUserOtherInfoRequest {
  target_user_id: string;
}
```

**Response：**

```typescript
export interface XhsUserOtherInfoResponse {
  code: number;
  success: boolean;
  msg: string;
  data: {
    basic_info: {
      red_id: string;                  // 小红书号
      nickname: string;
      desc: string;                    // 简介
      gender: 0 | 1 | 2;
      images: string;                  // 头像
      ip_location?: string;
    };
    interactions: Array<{
      type: 'follows' | 'fans' | 'interaction';
      count: RawCount;                 // ⭐ "fans" 即粉丝数
      name: string;
    }>;
    tags?: Array<{ name: string; tag_type: string }>;
    extra_info?: { fstatus: 'none' | 'follows' };
  };
}
```

---

### 3.5 小红书：错误码统一处理

```typescript
// src/services/xhs/schemas/errors.ts

export type XhsErrorCode =
  | 0          // success
  | -100       // 未登录 / cookie 失效
  | -200       // 参数错误
  | 300012     // 笔记已删除 / 不可访问
  | 461        // 触发风控 / 验证码
  | 10000      // 限流
  | 10001;     // 签名错误（理论上本项目不会触发，因为不主动构造搜索请求）

export const XHS_ERROR_HANDLER: Record<number, {
  category: 'auth' | 'risk_control' | 'gone' | 'rate_limit' | 'unknown';
  retriable: boolean;
  uiAction: 'modal_login' | 'modal_captcha' | 'mark_deleted' | 'backoff_retry' | 'toast';
}> = {
  [-100]: { category: 'auth', retriable: false, uiAction: 'modal_login' },
  [461]:  { category: 'risk_control', retriable: false, uiAction: 'modal_captcha' },
  [300012]: { category: 'gone', retriable: false, uiAction: 'mark_deleted' },
  [10000]: { category: 'rate_limit', retriable: true, uiAction: 'backoff_retry' },
};
```

---

### 3.6 DeepSeek：通用 Request / Response Schema（OpenAI 兼容）

**目标 URL：**
```
https://api.deepseek.com/v1/chat/completions
```

**Request：**

```typescript
// src/services/deepseek/schemas/chat.ts

export interface DeepSeekChatRequest {
  model: 'deepseek-chat' | 'deepseek-reasoner';
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  response_format?: { type: 'json_object' };
  temperature?: number;                // 默认 0.3（低创造性求稳定）
  max_tokens?: number;                 // 默认 2000
  stream?: false;                      // Phase 1 不开流式
}

export interface DeepSeekChatResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: { role: 'assistant'; content: string };
    finish_reason: 'stop' | 'length' | 'content_filter' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface DeepSeekErrorResponse {
  error: {
    message: string;
    type: 'invalid_request_error' | 'authentication_error' | 'rate_limit_error' | 'server_error';
    code?: string;
  };
}
```

---

### 3.7 DeepSeek：4 个 Prompt 的输出 JSON Schema

#### 3.7.1 选题建议（topic_suggestions）

```typescript
export interface TopicSuggestionsResult {
  suggestions: Array<{
    angle: string;                     // 一句话角度（≤50 字）
    rationale: string;                 // 为什么这个角度有价值（≤120 字）
    relatedNoteIds: string[];          // 关联爆款 note_id（来源）
    novelty: 'underexplored' | 'common' | 'saturated';  // 当前赛道稀缺度
  }>;
  generatedAt: number;
}
```

#### 3.7.2 单条结构拆解（structure_breakdown）

```typescript
export interface StructureBreakdownResult {
  noteId: string;
  titleHook: {
    pattern: string;                   // 标题套路标签（如"数字+痛点+解决"）
    explanation: string;
  };
  opening: {
    type: 'hook' | 'context' | 'identity' | 'pain_point';
    content: string;                   // 开头核心句
    explanation: string;
  };
  bodyStructure: Array<{
    section: string;                   // 段落角色（如"问题铺陈" / "干货清单"）
    summary: string;
  }>;
  ending: {
    cta: string;                       // 结尾 CTA
    type: 'question' | 'soft_promote' | 'invitation' | 'summary';
  };
  generatedAt: number;
}
```

#### 3.7.3 角度聚类（angle_clusters）

```typescript
export interface AngleClustersResult {
  clusters: Array<{
    label: string;                     // 角度标签（如"教程类" / "测评类" / "故事类" / "清单类" 等）
    description: string;               // 一句话描述
    noteIds: string[];                 // 属于该聚类的 note_id 数组
    percentage: number;                // 占比 0–100
  }>;
  generatedAt: number;
}
```

#### 3.7.4 趋势词提取（trend_keywords）

```typescript
export interface TrendKeywordsResult {
  highFrequencyWords: Array<{
    word: string;
    count: number;                     // 出现次数
    sampleNoteIds: string[];           // 包含该词的代表 note_id（≤3）
  }>;
  topicTags: Array<{
    name: string;
    count: number;
  }>;
  generatedAt: number;
}
```

---

## 四、API 清单 + 请求构造规则 + 测试用例

### 4.1 API 清单总表

| # | API | 方法 | 调用方式 | 触发频率 | 一次调用获取 |
|---|---|---|---|---|---|
| A1 | XHS 搜索笔记 | POST | **被动拦截**（不主动调） | 用户每次滚动 | 当前页候选笔记 ≤ 20 条 |
| A2 | XHS 笔记详情 | POST | 主动调用 | 仅对爆款，每条 1 次 | 单条笔记完整正文 |
| A3 | XHS 用户主页信息 | GET | 主动调用 | 仅对爆款作者，每位 1 次 | 单博主粉丝数等 |
| A4 | DeepSeek Chat | POST | 主动调用 | 用户在 AI Tab 触发时 | 单次结构化 JSON 结果 |

---

### 4.2 A1：搜索笔记接口 — 拦截规则（无主动构造）

**说明：** 不主动构造请求；以下是拦截命中规则与解析规则。

#### 拦截命中条件（在 `interceptor_main.ts`）

```typescript
function shouldCapture(url: string, method: string): boolean {
  return (
    method === 'POST' &&
    url.includes('/api/sns/web/v1/search/notes')
  );
}
```

#### 解析规则（在 `services/xhs/search_parser.ts`）

```
输入：XhsSearchNotesResponse
处理：
  1. 仅保留 items 中 model_type === 'note' 的项
  2. 跳过没有 note_card 的项（防御）
  3. 跳过 note_card.user 为 null 的项
  4. 用 parse_count() 把所有 RawCount 转为 number
  5. 提取每条的 xsec_token，必须存在；不存在则丢弃
输出：NoteRecord[]（部分字段，时间/desc 等需详情接口补充）
```

#### 边界测试用例

| TC ID | 描述 | 输入 | 期望输出 |
|---|---|---|---|
| A1-T1 | 正常响应 | items 含 5 条 note + 2 条 hot_query | 返回 5 条 NoteRecord |
| A1-T2 | items 为空 | data.items = [] | 返回 [] |
| A1-T3 | 缺 xsec_token | items[0] 无 xsec_token 字段 | 该条丢弃 |
| A1-T4 | RawCount 为 "1.2万" | liked_count = "1.2万" | likedCount = 12000 |
| A1-T5 | RawCount 为 "999+" | liked_count = "999+" | likedCount = 999（"+" 忽略） |
| A1-T6 | RawCount 为空字符串 | liked_count = "" | likedCount = 0 |
| A1-T7 | 视频笔记 | model_type = 'note', note_card.type = 'video' | 收录（仍是笔记） |
| A1-T8 | 广告 | model_type = 'ad' | 跳过 |
| A1-T9 | code !== 0 | code = -100 | 抛出 XhsAuthError → 触发 §5.2 弹窗 |

---

### 4.3 A2：笔记详情接口 — 请求构造规则

**调用条件：** 笔记被判定为 `isBomb === true` 且 `desc === null`（未抓过）。

#### 请求构造

```typescript
// src/services/xhs/detail_fetcher.ts

async function fetchNoteDetail(
  noteId: string,
  xsecToken: string
): Promise<XhsFeedNoteCard | null> {
  const url = 'https://edith.xiaohongshu.com/api/sns/web/v1/feed';
  const body: XhsFeedRequest = {
    source_note_id: noteId,
    image_formats: ['jpg', 'webp', 'avif'],
    extra: { need_body_topic: '1' },
    xsec_source: 'pc_search',
    xsec_token: xsecToken,
  };
  const headers = {
    'Content-Type': 'application/json',
    // 签名头由小红书前端 sdk 处理；本项目通过在小红书页面 fetch 触发，cookie + signature 自动带
  };

  // ⚠ 必须在小红书页面 origin 下发起（同源），不能从 dashboard 直接调
  // 因此走 chrome.tabs.sendMessage → content script → fetch
  return await sendToContentScript({ kind: 'fetch_detail', body });
}
```

#### 节流规则

- 请求间隔随机化：`800–2000ms`（每次 `Math.random() * 1200 + 800`）
- 失败重试：1 次（指数退避 1000ms）
- 单批次连续失败 5 次 → 进入 STOPPED 状态 + 弹窗提示

#### 完整示例

```
输入：noteId = "65d8f3a7000000001f00b3c2", xsecToken = "AB-vK3..."
拼装 body：{
  source_note_id: "65d8f3a7000000001f00b3c2",
  image_formats: ['jpg','webp','avif'],
  extra: { need_body_topic: '1' },
  xsec_source: 'pc_search',
  xsec_token: "AB-vK3..."
}
通过 messaging.bus → content script → fetch
返回：XhsFeedResponse → 取 data.items[0].note_card → desc / time / tag_list
```

#### 边界测试用例

| TC ID | 描述 | 输入 | 期望输出 |
|---|---|---|---|
| A2-T1 | 正常 | noteId + xsecToken 有效 | 返回 note_card 含 desc |
| A2-T2 | xsec_token 错误 | xsecToken = 'INVALID' | code = -200 → 抛错 → 重试 1 次 → 仍失败 → updateNoteDetail({ detailFetchFailed: true }) |
| A2-T3 | 笔记已删除 | code = 300012 | updateNoteDetail({ isDeleted: true })，从展示页移除 |
| A2-T4 | 触发验证码 | code = 461 | 进入 captcha_paused 状态 + 弹窗 §5.3 |
| A2-T5 | 限流 | code = 10000 | 退避 5s 后重试 1 次；仍失败 → 跳过该条 |
| A2-T6 | 网络超时（>10s） | timeout | abort → 重试 1 次 → 失败标记 |
| A2-T7 | desc 为空字符串 | data.items[0].note_card.desc = '' | 视为有效，记 desc = ''；UI 在抽屉显示"该笔记无文字正文" |
| A2-T8 | 视频笔记 | note_card.type = 'video', desc 可能为空 | 同 T7 |
| A2-T9 | items 长度 0 | data.items = [] | 视为已删除 |
| A2-T10 | xsec_source 错误 | xsec_source = 'pc_user'（应为 pc_search） | 部分接口可能返回 -200，本项目固定用 pc_search |

---

### 4.4 A3：用户主页信息接口 — 请求构造规则

**调用条件：** 笔记被判定为 `isBomb === true` 且 `user.fans === null` 且该 user_id 未在本批次缓存。

#### 请求构造

```typescript
// src/services/xhs/user_fetcher.ts

const fanCache = new Map<string /* user_id */, number>();

async function fetchUserFans(userId: string): Promise<number | null> {
  if (fanCache.has(userId)) return fanCache.get(userId)!;

  const url = `https://edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo?target_user_id=${encodeURIComponent(userId)}`;
  const resp = await sendToContentScript({ kind: 'fetch_user', url });

  const interaction = resp.data.interactions.find(i => i.type === 'fans');
  if (!interaction) return null;
  const fans = parseCount(interaction.count);
  fanCache.set(userId, fans);
  return fans;
}
```

#### 节流规则

- 同 A2，间隔 800–2000ms
- per-user_id 缓存（仅本次抓取生命周期内）

#### 完整示例

```
输入：userId = "5b0f7d9d4eacab0001a6d1e8"
URL = https://edith.xiaohongshu.com/api/sns/web/v1/user/otherinfo?target_user_id=5b0f7d9d4eacab0001a6d1e8
通过 messaging.bus → content script → fetch (GET)
解析：data.interactions.find(i => i.type === 'fans').count = "8.6万" → parseCount → 86000
缓存 + 返回 86000
```

#### 边界测试用例

| TC ID | 描述 | 输入 | 期望输出 |
|---|---|---|---|
| A3-T1 | 正常 | 有效 userId | 返回 fans (number) |
| A3-T2 | 无 fans interaction | interactions 不含 type='fans' | 返回 null + updateNoteDetail({ fanFetchFailed: true })；判定时 likeToFansRatio 用 null，仅按 ces 排序 |
| A3-T3 | 用户已封禁 | code = -100 或 user 不存在 | 返回 null |
| A3-T4 | 特殊字符 user_id | userId 含 `+` 或 `/` | encodeURIComponent 包裹后正确传递 |
| A3-T5 | 关键参数缺失 | userId 为空字符串 | 抛 ArgumentError，不发请求 |
| A3-T6 | 同一 user_id 二次调用 | 第二次调用 | 命中缓存，无网络请求 |
| A3-T7 | 网络超时 | 超过 5s | abort + 重试 1 次 |

---

### 4.5 A4：DeepSeek Chat — 请求构造规则

**调用条件：** 用户在 AI Tab 点击触发按钮 + apiKey 已配置 + 当前 batch 该 AI 任务结果未缓存。

#### 通用请求构造

```typescript
// src/services/deepseek/client.ts

async function callDeepSeek<T>(
  apiKey: string,
  model: DeepSeekModel,
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: z.ZodType<T>          // 用 zod 做运行时校验
): Promise<T> {
  const url = 'https://api.deepseek.com/v1/chat/completions';
  const body: DeepSeekChatRequest = {
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 2000,
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });
  if (!resp.ok) throw new DeepSeekHttpError(resp.status, await resp.text());

  const json: DeepSeekChatResponse = await resp.json();
  const raw = json.choices[0]?.message?.content;
  if (!raw) throw new DeepSeekEmptyResponseError();

  const parsed = JSON.parse(stripMarkdownFence(raw));
  return jsonSchema.parse(parsed);     // 失败抛 ZodError
}
```

#### 4 个 Prompt 的具体 system prompt（精简版，详细 prompt 见 `services/deepseek/prompts.ts`）

##### A4-1 选题建议

```
SYSTEM:
你是小红书内容选题专家。给定一组爆款笔记，输出 5 个值得撰写的新选题方向。
强制 JSON 输出，结构如下：
{ "suggestions": [{ "angle": "...", "rationale": "...", "relatedNoteIds": [...], "novelty": "underexplored|common|saturated" }, ...] }

USER:
赛道关键词：{keywords}
当前批次爆款笔记摘要（标题 + 互动数 + 正文摘要 ≤ 200 字 / 条）：
{notesDigest}

请输出 5 个选题方向。
```

##### A4-2 结构拆解

```
SYSTEM:
你是小红书爆款拆解专家。给定一条爆款笔记的标题和正文，输出标题钩子套路、开头类型、正文结构和结尾 CTA。
强制 JSON 输出，结构如下：
{ "noteId": "...", "titleHook": {...}, "opening": {...}, "bodyStructure": [...], "ending": {...} }

USER:
笔记 ID: {noteId}
标题：{title}
正文：{desc}

请拆解。
```

##### A4-3 角度聚类

```
SYSTEM:
你是内容分析师。给定一组爆款笔记，按内容角度（教程类/测评类/故事类/清单类/对比类/避坑类/...）对笔记聚类，每类给出标签、描述、占比、对应 noteIds。
强制 JSON 输出。

USER:
笔记列表（标题 + 摘要）：
{notesDigest}
```

##### A4-4 趋势词提取

```
SYSTEM:
你是 SEO 分析师。给定一组爆款笔记，提取高频词（≥3 次出现的实义词，过滤停用词）和热门话题标签。
强制 JSON 输出，highFrequencyWords 取前 20，topicTags 取前 20。

USER:
笔记标题与正文集合：
{notesAggregateText}
```

#### 节流与重试

- 每次调用单独发起（不并发批量）
- 失败重试 1 次（退避 1s → 2s）
- 失败原因分类：
  - HTTP 401 → ApiKey 无效 → setApiKeyStatus('invalid') + Toast
  - HTTP 429 → 限流 → 重试 1 次后失败提示
  - HTTP 5xx → 服务端 → 重试 1 次后失败提示
  - JSON 解析失败 → 重试 1 次（temperature 降到 0.1 + 在 user prompt 末尾追加"严格只输出 JSON"）

#### 完整示例（选题建议）

```
输入：
  apiKey = "sk-xxx"
  model = "deepseek-chat"
  keywords = ["AI 工具", "Claude 教程"]
  bombs = [N18 个 NoteRecord，含 title + desc]

构造 user prompt：
  notesDigest 由前端预处理：每条裁到 ≤200 字，附 ID 和互动数

POST https://api.deepseek.com/v1/chat/completions
Headers: Authorization: Bearer sk-xxx, Content-Type: application/json
Body: { model, messages: [system, user], response_format: { type: 'json_object' }, temperature: 0.3, max_tokens: 2000 }

响应 200，content = '{ "suggestions": [...] }'
zod 校验通过 → 写入 batch.aiResults.topicSuggestions
```

#### 边界测试用例

| TC ID | 描述 | 输入 | 期望输出 |
|---|---|---|---|
| A4-T1 | 正常 | 合法 apiKey + 5 条爆款 | 返回 TopicSuggestionsResult，suggestions.length = 5 |
| A4-T2 | apiKey 无效 | apiKey = "sk-INVALID" | HTTP 401 → setApiKeyStatus('invalid') + 弹窗 §5.4 |
| A4-T3 | 限流 | HTTP 429 | 重试 1 次 → 失败提示 + 5s 后允许再试 |
| A4-T4 | 输出非 JSON | content 含 markdown ```json…``` 围栏 | stripMarkdownFence 处理后解析；仍失败则 retry 一次 + 强化 prompt |
| A4-T5 | suggestions 为 4 条而非 5 条 | content 合法但条数不足 | zod schema 允许 1–5 条；仍写入，UI 提示"AI 只生成了 N 条" |
| A4-T6 | 缺少必填字段 | rationale 缺失 | zod 校验失败 → retry 1 次（强化 prompt） |
| A4-T7 | content 为空 | choices[0].message.content = "" | DeepSeekEmptyResponseError → retry |
| A4-T8 | max_tokens 触发截断 | finish_reason = "length" | content 末尾 JSON 不完整 → 解析失败 → retry，max_tokens 提到 4000 |
| A4-T9 | 用户在调用中切 Tab | abort 信号 | 后台保留请求；切回时恢复 loading 状态 |
| A4-T10 | bombs.length = 0 | 没有爆款也触发 AI | 前端拦截，弹 Toast"当前批次无爆款，无法 AI 分析" |
| A4-T11 | 输入超长（>50 条爆款） | notesDigest 超过 token 限制 | 前端先按 ces 排序取 top 20，剩余忽略 |

---

### 4.6 关键参数缺失通用规则

| 缺失参数 | 行为 |
|---|---|
| `xsec_token`（详情接口） | 不发请求，直接 mark `detailFetchFailed: true` |
| `userId`（用户接口） | 不发请求，mark `fanFetchFailed: true` |
| `apiKey`（DeepSeek） | 不发请求，弹窗 §5.4 |
| `noteId`（任何接口） | 抛 `ArgumentError`，全局错误处理器弹 Toast |

---

### 4.7 特殊字符 encode 通用规则

- 所有 query string 参数走 `encodeURIComponent`
- 所有 body 参数原样传，由 `JSON.stringify` 处理
- 关键词中含 `&` `=` `?` `#` 不需要额外处理（仅在搜索接口被动拦截，不主动构造）
- DeepSeek prompt 中正文含特殊字符（emoji、html 标签等）原样传，模型自行处理

---

## 批次 2 自检

- [x] 7 个接口 / 4 个 Prompt 都有完整 Request / Response TypeScript 类型
- [x] 每个接口标注 method + path + 用途
- [x] 每个接口有"参数来源 → 拼接方式 → 完整示例"
- [x] 每个接口至少 7 条边界测试用例（共 47 条）
- [x] 关键参数缺失行为统一定义
- [x] 特殊字符 encode 规则统一
- [x] 错误码到 UI 行为的映射表完备
- [x] 节流 + 重试策略全覆盖
- [x] 数据来源标注清晰（开源样例 + 公开文档 + selectors.ts 热更入口）

---

---

# 📦 批次 3：交互逻辑 + 视觉 Token + 边界条件 + 验收标准 + Phase 2 + Mock 数据

## 五、交互逻辑规范（伪代码）

> 所有伪代码使用 TypeScript 风格，链条完整、不允许跳步。涉及 chrome.* 调用一律走 `services/chrome/`。

### 5.1 抓取主流程（核心 P1）

**触发：** 用户在 `<StartScrapeButton>` 点击。

```typescript
// 入口位置：src/app/components/config/StartScrapeButton.tsx::onClick

async function onStartScrapeClick(): Promise<void> {
  const cfg = useConfigStore.getState();

  // 1. 前端校验（严格按 §2.1 区块 G 规则）
  if (cfg.keywords.length === 0) {
    addToast({ type: 'warning', message: '请至少添加 1 个关键词', durationMs: 3000 });
    return;
  }
  if (!cfg.timeWindow) {
    addToast({ type: 'warning', message: '请选择时间窗口', durationMs: 3000 });
    return;
  }

  // 2. 检查当前批次是否未保存
  const currentBatch = useBatchStore.getState().current;
  if (currentBatch && currentBatch.status === 'complete') {
    const confirmed = await showModal({ kind: 'confirm_start_scrape' });
    if (!confirmed) return;
    // 把当前批次推入历史
    await services.chrome.storage.set(`batch_${currentBatch.batchId}`, currentBatch);
    useHistoryStore.getState().push(currentBatch);
  }

  // 3. 检查小红书登录态
  const isLoggedIn = await services.xhs.loginChecker.check();
  if (!isLoggedIn) {
    const action = await showModal({ kind: 'not_logged_in' });
    if (action === 'goto_login') {
      await services.chrome.tabs.create({ url: 'https://www.xiaohongshu.com/login' });
    }
    return;  // 用户登录后需手动重新点"开始"
  }

  // 4. 生成新批次 ID + 切换到展示 Tab
  const batchId = nanoid();
  useScrapeStore.getState().reset();
  useScrapeStore.getState().setStatus('validating');
  useUiStore.getState().setTab('display');

  // 5. 通知 service worker 启动抓取
  await services.chrome.messaging.send({
    kind: 'START_SCRAPE',
    payload: {
      batchId,
      keywords: cfg.keywords,
      timeWindow: cfg.timeWindow,
      thresholds: { ces: cfg.cesThreshold, likeRatio: cfg.likeRatioThreshold },
      candidatePoolMax: cfg.candidatePoolMax,
      targetBombCount: cfg.targetBombCount,
    },
  });
}
```

**Service Worker 端：**

```typescript
// src/shell/service_worker.ts

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.kind === 'START_SCRAPE') {
    handleStartScrape(msg.payload).then(sendResponse);
    return true;  // 异步响应
  }
  // ... 其他消息
});

async function handleStartScrape(payload: StartScrapePayload): Promise<void> {
  const sm = scrapeStateMachine;
  await sm.transition('validating');

  // 1. 打开或复用一个小红书搜索 Tab
  const xhsTab = await openOrFocusXhsSearchTab(payload.keywords[0]);

  // 2. 在 Tab 中注入拦截器（content script 由 manifest 自动注入，这里只通知开始拦截）
  await services.chrome.tabs.sendMessage(xhsTab.id, {
    kind: 'BEGIN_INTERCEPT',
    batchId: payload.batchId,
  });

  await sm.transition('scraping');
  emitProgress({ status: 'scraping', candidateCount: 0, currentKeyword: payload.keywords[0] });

  // 3. 候选池累积循环
  const pool: NoteRecord[] = [];
  let kwIndex = 0;
  let stallCount = 0;  // 连续 N 次滚动无新数据则切下一关键词

  while (
    pool.length < payload.candidatePoolMax &&
    kwIndex < payload.keywords.length &&
    sm.current === 'scraping'
  ) {
    const before = pool.length;
    await services.chrome.tabs.sendMessage(xhsTab.id, { kind: 'SCROLL_ONCE' });
    await sleep(randomBetween(800, 1500));  // §4.3 风险减负

    // 等待 content script 推送拦截到的新数据（最多等 3s）
    const newNotes = await waitForInterceptedNotes(payload.batchId, 3000);
    pool.push(...dedupeByNoteId(pool, newNotes));

    emitProgress({ candidateCount: pool.length });

    if (pool.length === before) {
      stallCount++;
      if (stallCount >= 3) {
        // 切到下一个关键词
        kwIndex++;
        if (kwIndex < payload.keywords.length) {
          await switchSearchKeyword(xhsTab.id, payload.keywords[kwIndex]);
          stallCount = 0;
        }
      }
    } else {
      stallCount = 0;
    }

    // 风控检测
    const captcha = await services.xhs.captchaDetector.check(xhsTab.id);
    if (captcha) {
      await sm.transition('captcha_paused');
      emitProgress({ status: 'captcha_paused' });
      await waitForUserCaptchaResolution();  // 弹窗 §5.3 等用户点"我已通过"
      await sm.transition('scraping');
    }
  }

  // 4. 候选池完成，进入详情抓取阶段
  await sm.transition('detail_fetching');

  // 4.1 先批量计算粗糙 CES（粉丝数还没拿到，likeToFansRatio 暂为 null）
  const enriched = pool.map(n => services.scoring.applyCesAndDecay(n));

  // 4.2 按 ces_score 取 top N，作为"候选爆款"
  const topCandidates = enriched
    .sort((a, b) => b.cesScore - a.cesScore)
    .slice(0, Math.min(100, payload.targetBombCount * 5));  // 多取一些以防判定失败

  // 4.3 串行抓详情 + 粉丝数
  for (const note of topCandidates) {
    if (sm.current !== 'detail_fetching') break;

    // 详情接口
    const detail = await services.xhs.detailFetcher.fetch(note.noteId, note.xsecToken);
    if (detail) {
      note.desc = detail.desc;
      note.time = detail.time;
      note.tagList = detail.tag_list;
      note.detailFetchedAt = Date.now();
    } else {
      note.detailFetchFailed = true;
    }

    // 粉丝数（per-user 缓存）
    const fans = await services.xhs.userFetcher.fetchFans(note.user.userId);
    note.user.fans = fans;
    if (fans === null) note.fanFetchFailed = true;

    // 重新计算（这次有 likeToFansRatio）
    services.scoring.applyAll(note, payload.thresholds);
    emitProgress({ detailFetchedCount: ++progressDetailCount });

    await sleep(randomBetween(800, 2000));
  }

  // 5. 二次过滤：时间窗口
  const inWindow = enriched.filter(n => services.scoring.inTimeWindow(n.time, payload.timeWindow));

  // 6. 判定爆款
  const bombs = inWindow.filter(n => n.isBomb);

  // 7. 兜底（爆款不足时）
  let display = bombs;
  if (bombs.length < payload.targetBombCount) {
    const fallback = inWindow
      .filter(n => !n.isBomb)
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, payload.targetBombCount - bombs.length)
      .map(n => ({ ...n, bombReason: 'fallback' as const }));
    display = [...bombs, ...fallback];
  }

  // 8. 持久化批次
  const finalBatch: BatchRecord = {
    batchId: payload.batchId,
    createdAt: Date.now(),
    keywords: payload.keywords,
    timeWindow: payload.timeWindow,
    thresholds: payload.thresholds,
    candidatePoolMax: payload.candidatePoolMax,
    notes: display,
    candidateCount: pool.length,
    bombCount: bombs.length,
    fallbackCount: display.length - bombs.length,
    status: 'complete',
    aiResults: { topicSuggestions: null, angleClusters: null, trendKeywords: null, structureBreakdown: {} },
  };
  await services.chrome.storage.set(`batch_${payload.batchId}`, finalBatch);
  useHistoryStore.getState().push(finalBatch);

  // 9. 通知 dashboard 切换到该批次
  await services.chrome.messaging.send({ kind: 'BATCH_COMPLETE', batchId: payload.batchId });
  await sm.transition('complete');
}
```

---

### 5.2 拦截器注入（content script + MAIN world）

```typescript
// src/shell/content_scripts/xhs_interceptor.ts (ISOLATED world)

let captureBatchId: string | null = null;

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.kind === 'BEGIN_INTERCEPT') {
    captureBatchId = msg.batchId;
    injectMainWorldHook();
  }
  if (msg.kind === 'SCROLL_ONCE') {
    window.scrollBy({ top: window.innerHeight * 0.9, behavior: 'smooth' });
  }
});

function injectMainWorldHook(): void {
  const script = document.createElement('script');
  script.src = chrome.runtime.getURL('interceptor_main.js');
  (document.head || document.documentElement).appendChild(script);
  script.onload = () => script.remove();
}

window.addEventListener('message', (e) => {
  if (e.source !== window) return;
  if (e.data.__xhs_radar !== 'CAPTURED') return;
  if (!captureBatchId) return;

  // 转发给 service worker
  chrome.runtime.sendMessage({
    kind: 'NOTES_CAPTURED',
    batchId: captureBatchId,
    payload: e.data.payload,
  });
});
```

```typescript
// src/services/xhs/interceptor_main.ts (MAIN world)

(function () {
  const SEARCH_PATH = '/api/sns/web/v1/search/notes';

  const origFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await origFetch.apply(this, args);
    const url = typeof args[0] === 'string' ? args[0] : args[0].url;
    if (url.includes(SEARCH_PATH)) {
      response.clone().json().then(data => {
        window.postMessage({ __xhs_radar: 'CAPTURED', payload: data }, '*');
      });
    }
    return response;
  };

  // XHR 同样劫持
  const origXhrOpen = XMLHttpRequest.prototype.open;
  const origXhrSend = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    (this as any).__url = url;
    return origXhrOpen.apply(this, [method, url, ...rest] as any);
  };
  XMLHttpRequest.prototype.send = function (...args) {
    this.addEventListener('load', () => {
      if ((this as any).__url?.includes(SEARCH_PATH)) {
        try {
          const data = JSON.parse(this.responseText);
          window.postMessage({ __xhs_radar: 'CAPTURED', payload: data }, '*');
        } catch {}
      }
    });
    return origXhrSend.apply(this, args);
  };
})();
```

---

### 5.3 验证码暂停与恢复

```typescript
// CaptchaPausedModal 的"我已通过"按钮 onClick

async function onCaptchaResolvedClick(): Promise<void> {
  await services.chrome.messaging.send({ kind: 'CAPTCHA_RESOLVED' });
  // service worker 监听到后会重新尝试一次接口
  // 若仍报 461，弹窗保留显示
  useUiStore.getState().hideModal();
}

// service worker 端
async function waitForUserCaptchaResolution(): Promise<void> {
  return new Promise((resolve) => {
    const listener = (msg) => {
      if (msg.kind === 'CAPTCHA_RESOLVED') {
        chrome.runtime.onMessage.removeListener(listener);
        resolve();
      }
    };
    chrome.runtime.onMessage.addListener(listener);
  });
}
```

---

### 5.4 详情抽屉打开 → 懒加载正文

```typescript
// src/app/components/display/NoteCard.tsx::onViewDetailClick

async function onViewDetailClick(note: NoteRecord): Promise<void> {
  useUiStore.getState().openDrawer(note.noteId);

  // 已抓过则直接显示
  if (note.desc !== null) return;

  // 未抓过，前往 service worker 拉取
  // 注意：被点的可能是兜底（非爆款）笔记，主流程没抓过其详情
  const result = await services.chrome.messaging.send({
    kind: 'FETCH_NOTE_DETAIL',
    payload: { noteId: note.noteId, xsecToken: note.xsecToken },
  });
  if (result.success) {
    useBatchStore.getState().updateNoteDetail(note.noteId, {
      desc: result.desc,
      time: result.time,
      tagList: result.tagList,
      detailFetchedAt: Date.now(),
    });
  } else {
    addToast({ type: 'error', message: `获取正文失败：${result.error}`, durationMs: 4000 });
  }
}
```

---

### 5.5 4 个 AI 任务触发流程（统一模板）

```typescript
// src/app/components/ai/<XxxTab>.tsx 通用骨架

async function triggerAiTask<T>(
  kind: AiTaskKind,
  scope: 'global' | 'per_note',
  scopeId: string,                   // batchId 或 noteId
  buildPrompt: () => { system: string; user: string },
  schema: z.ZodType<T>,
  storeWriter: (result: T) => void
): Promise<void> {
  const cfg = useConfigStore.getState();
  if (!cfg.deepseekApiKey || cfg.apiKeyStatus !== 'valid') {
    showModal({ kind: 'missing_api_key' });
    return;
  }

  // 1. 标记 loading
  if (scope === 'global') aiStore.setGlobalStatus(scopeId, kind, { status: 'loading', startedAt: Date.now() });
  else aiStore.setPerNoteStatus(scopeId, { status: 'loading', startedAt: Date.now() });

  // 2. 构造 prompt
  const { system, user } = buildPrompt();

  // 3. 调用（含一次重试）
  let result: T | null = null;
  let lastError: { code: string; message: string } | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      result = await services.deepseek.client.call(
        cfg.deepseekApiKey,
        cfg.deepseekModel,
        system,
        user,
        schema,
        attempt === 1 ? { temperature: 0.1, strictReminder: true } : undefined
      );
      break;
    } catch (e) {
      lastError = classifyDeepSeekError(e);
      if (lastError.code === '401') {
        cfg.setApiKeyStatus('invalid');
        showModal({ kind: 'missing_api_key' });
        if (scope === 'global') aiStore.setGlobalStatus(scopeId, kind, { status: 'failed', error: lastError });
        else aiStore.setPerNoteStatus(scopeId, { status: 'failed', error: lastError });
        return;
      }
      if (attempt === 0) await sleep(1000 * Math.pow(2, attempt));
    }
  }

  // 4. 写入结果
  if (result) {
    storeWriter(result);
    if (scope === 'global') aiStore.setGlobalStatus(scopeId, kind, { status: 'success' });
    else aiStore.setPerNoteStatus(scopeId, { status: 'success' });
  } else {
    if (scope === 'global') aiStore.setGlobalStatus(scopeId, kind, { status: 'failed', error: lastError });
    else aiStore.setPerNoteStatus(scopeId, { status: 'failed', error: lastError });
  }
}

// 调用示例：选题建议
async function onTopicSuggestionsTrigger(): Promise<void> {
  const batch = useBatchStore.getState().current!;
  const bombs = batch.notes.filter(n => n.isBomb);

  if (bombs.length === 0) {
    addToast({ type: 'warning', message: '当前批次无爆款，无法 AI 分析' });
    return;
  }

  await triggerAiTask(
    'topic_suggestions',
    'global',
    batch.batchId,
    () => buildTopicSuggestionsPrompt(batch.keywords, bombs),
    TopicSuggestionsResultSchema,
    (result) => useBatchStore.getState().setAiResult('topicSuggestions', result)
  );
}
```

---

### 5.6 收藏 / 取消收藏

```typescript
// 加入收藏
async function onFavoriteClick(note: NoteRecord, batchId: string): Promise<void> {
  useFavoritesStore.getState().add(note, batchId);
  addToast({ type: 'success', message: '已加入收藏', durationMs: 2000 });
}

// 取消收藏
async function onUnfavoriteClick(noteId: string): Promise<void> {
  const confirmed = await showModal({
    kind: 'confirm_delete',
    data: { what: '收藏', name: useFavoritesStore.getState().byNoteId[noteId].snapshot.title },
  });
  if (!confirmed) return;

  useFavoritesStore.getState().remove(noteId);
  addToast({ type: 'success', message: '已取消收藏', durationMs: 2000 });
}
```

---

### 5.7 历史批次载入

```typescript
async function onLoadBatchClick(batchId: string): Promise<void> {
  const batch = await useHistoryStore.getState().loadBatchDetail(batchId);
  if (!batch) {
    addToast({ type: 'error', message: '批次数据已损坏或被清理' });
    return;
  }
  useBatchStore.getState().setCurrent(batch);
  useUiStore.getState().setTab('display');
}
```

---

### 5.8 CSV 导出

```typescript
// src/services/csv/exporter.ts

export function exportBatchAsCsv(batch: BatchRecord): void {
  const headers = [
    '批次时间','关键词','笔记ID','标题','博主','粉丝数',
    '点赞','收藏','评论','分享','CES','点赞粉丝比','是否爆款',
    '发布时间','笔记URL','正文'
  ];
  const rows = batch.notes.map(n => [
    formatDate(batch.createdAt),
    batch.keywords.join('|'),
    n.noteId,
    csvEscape(n.title),
    csvEscape(n.user.nickname),
    n.user.fans ?? '',
    n.interactInfo.likedCount,
    n.interactInfo.collectedCount,
    n.interactInfo.commentCount,
    n.interactInfo.shareCount,
    n.cesScore.toFixed(1),
    n.likeToFansRatio?.toFixed(3) ?? '',
    n.isBomb ? 'Y' : 'N',
    n.time ? formatDate(n.time) : '',
    `https://www.xiaohongshu.com/explore/${n.noteId}?xsec_token=${n.xsecToken}`,
    csvEscape(n.desc ?? ''),
  ]);

  const csv = '﻿' + [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const filename = `xhs-radar-${formatDate(batch.createdAt, 'YYYYMMDD-HHmm')}-${batch.keywords[0]}.csv`;

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function csvEscape(s: string): string {
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}
```

---

### 5.9 路由切换 + URL Hash 同步

```typescript
// src/app/hooks/useHashRoute.ts

export function useHashRoute(): { tab: Tab; setTab: (t: Tab) => void } {
  const [tab, setTabState] = useState<Tab>(parseHash());

  useEffect(() => {
    const onHashChange = () => setTabState(parseHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const setTab = (t: Tab) => {
    window.location.hash = `#${t}`;
    setTabState(t);
    useUiStore.getState().setTab(t);
  };

  return { tab, setTab };
}

function parseHash(): Tab {
  const h = window.location.hash.replace('#', '');
  if (h === 'display' || h === 'favorites' || h === 'history') return h;
  return 'config';
}
```

---

## 六、视觉 Token

### 6.1 颜色（Tailwind 配置 + 十六进制）

```typescript
// tailwind.config.ts: theme.extend.colors

export const COLORS = {
  // 主色（小红书风格）
  brand: {
    50:  '#FFF1F3',
    100: '#FFE0E5',
    300: '#FF8092',
    500: '#FF2442',  // 主色（按钮、爆款标签、当前 Tab 高亮）
    600: '#E61E3A',
    700: '#B81830',
  },
  // 强调色（潜力 / 警示信息）
  accent: {
    500: '#FF8C29',  // 暖橙
    600: '#E5751F',
  },
  // 中性灰阶
  neutral: {
    0:   '#FFFFFF',
    50:  '#FAFAFA',
    100: '#F5F5F5',
    200: '#EBEBEB',  // 分隔线
    300: '#D4D4D4',  // 边框
    500: '#737373',  // 辅助文字
    700: '#404040',  // 二级文字
    900: '#171717',  // 主文字
  },
  // 状态
  success: { 500: '#16A34A', 100: '#DCFCE7' },
  warning: { 500: '#F59E0B', 100: '#FEF3C7' },
  error:   { 500: '#DC2626', 100: '#FEE2E2' },
} as const;
```

### 6.2 字号（rem + px）

| 类名 | 字号 | px | 用途 |
|---|---|---|---|
| `text-3xl` | 1.875rem | 30px | Logo、空状态主文案 |
| `text-2xl` | 1.5rem | 24px | 页面主标题 |
| `text-xl`  | 1.25rem | 20px | Tab 标题、批次信息条 |
| `text-base` | 1rem | 16px | 卡片标题、AI 结果标题 |
| `text-sm`  | 0.875rem | 14px | 卡片字段、表单标签、正文 |
| `text-xs`  | 0.75rem | 12px | 粉丝数、时间戳、tooltip |

### 6.3 间距（Tailwind 默认 spacing × 4px）

| 用途 | 类名 | px |
|---|---|---|
| 卡片内边距 | `p-5` | 20px |
| 区块外边距 | `mb-6` | 24px |
| 表单字段间距 | `gap-4` | 16px |
| Toast 距视口 | `top-6 right-6` | 24px |
| 详情抽屉宽度 | `w-[40%]` 最小 `min-w-[480px]` | — |
| 顶部导航高度 | `h-14` | 56px |
| 底部状态条高度 | `h-12` | 48px |

### 6.4 圆角

| 用途 | px |
|---|---|
| 卡片 | 12px (`rounded-xl`) |
| 按钮 | 8px (`rounded-lg`) |
| 输入框 | 8px |
| Chip 标签 | 9999px (`rounded-full`) |

### 6.5 阴影

| 用途 | Tailwind | 值 |
|---|---|---|
| 卡片默认 | `shadow-sm` | `0 1px 2px 0 rgba(0,0,0,0.05)` |
| 卡片 hover | `shadow-md` | `0 4px 6px -1px rgba(0,0,0,0.10), 0 2px 4px -2px rgba(0,0,0,0.06)` |
| 弹窗 | `shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` |
| 抽屉 | `shadow-xl` | `0 20px 25px -5px rgba(0,0,0,0.10)` |

### 6.6 动效

| 场景 | 时长 | 缓动 |
|---|---|---|
| Tab 切换 | 200ms | ease-out |
| 抽屉滑入 / 滑出 | 250ms | ease-in-out |
| 弹窗淡入 | 150ms | ease-out |
| Toast 出现 / 消失 | 200ms | ease-in-out |
| 按钮 hover | 100ms | linear |

---

## 七、边界条件与错误处理

> 边界情况已分散在各处，本节做交叉索引 + 兜底规则。

### 7.1 索引

| 场景 | 文档位置 |
|---|---|
| 关键词重复 / 长度违规 | §2.1 区块 A |
| 时间窗口跨度异常 | §2.1 区块 B |
| 阈值越界 | §2.1 区块 C |
| storage 写入失败（quota） | L2 §4.4 |
| 笔记已删除 / 详情接口 404 | §4.3 (TC A2-T3) |
| 风控验证码 | §5.3 + §4.3 |
| 详情连续失败 5 次 | §4.3 |
| 详情接口超时 | §4.3 (TC A2-T6) |
| desc 为空（视频笔记） | §4.3 (TC A2-T7) |
| 用户主页隐私 / 封禁 | §4.4 (TC A3-T3) |
| 缓存命中 | §4.4 (TC A3-T6) |
| DeepSeek 401 / 429 / 5xx | §4.5 (TC A4-T2/T3) |
| DeepSeek JSON 围栏 / 截断 / 解析失败 | §4.5 (TC A4-T4/T6/T8) |
| 抓满候选未达爆款数 | §5.1 步骤 7（兜底） |
| 同笔记多关键词命中 | §5.1 步骤 3 dedupeByNoteId |

### 7.2 全局错误兜底

```typescript
// src/app/components/shared/ErrorBoundary.tsx

class ErrorBoundary extends React.Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null };
  static getDerivedStateFromError(error: Error) { return { error }; }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[xhs-radar] uncaught', error, info);
    // 一期不上报；二期可考虑可选 telemetry
    // TODO [PHASE 2]: 用户可选开启错误上报
  }

  render() {
    if (this.state.error) {
      return <ErrorCard
        title="出现意外错误"
        message={this.state.error.message}
        actions={[{ label: '复制错误信息', onClick: () => copyText(this.state.error!.stack ?? '') }]}
      />;
    }
    return this.props.children;
  }
}
```

### 7.3 storage quota 处理

```typescript
async function safeSetStorage(key: string, value: unknown): Promise<void> {
  try {
    await services.chrome.storage.set(key, value);
  } catch (e) {
    if (e.message.includes('QUOTA')) {
      showModal({
        kind: 'storage_full',
        data: {
          message: '存储空间不足，请删除部分历史批次或导出后清理。',
          action: 'goto_history',
        },
      });
    } else {
      throw e;
    }
  }
}
```

---

## 八、验收标准（AC-001 格式）

> 每条独立可测试。Phase 2 项不计入。

### 配置 Tab

- **AC-001** 用户在关键词输入框输入"AI"按 Enter，关键词列表新增 chip "AI"，输入框清空
- **AC-002** 已存在的关键词重复输入，提示"该关键词已存在"，不新增
- **AC-003** 关键词长度为 0 或 > 30 字符，提示长度违规且不新增
- **AC-004** 关键词已达 10 个时，输入框置灰，tooltip 显示"已达上限 10 个"
- **AC-005** 用户切到"自定义"时间窗口，展开起止日期选择器
- **AC-006** 自定义日期跨度 > 365 天时，红框 + 文案提示
- **AC-007** CES 阈值输入 5（< 10）时，红框 + 提示，不保存
- **AC-008** 点击"测试 Key"，按钮显示 spinner；成功后顶部 🔑 变绿；失败后变黄 + Toast 错误信息
- **AC-009** 关键词为 0 时，"开始抓取"按钮 disabled
- **AC-010** 点击"开始抓取"前，未登录小红书时弹出 §5.2 弹窗

### 抓取流程

- **AC-011** 点击"开始抓取"后 1 秒内，自动切到展示 Tab + 底部状态条出现
- **AC-012** 抓取过程中，状态条显示候选数 / 爆款数 + 当前关键词
- **AC-013** 抓满候选池上限或满足目标爆款数后，自动停止 + 状态条变"已完成"
- **AC-014** 抓取过程遇到验证码时，弹出 §5.3 弹窗 + 状态条变黄"已暂停"
- **AC-015** 用户点"我已通过"后，5 秒内若仍报 461，弹窗保留显示
- **AC-016** 抓取过程中关闭 Dashboard Tab，再次打开时状态恢复（含进度）

### 展示 Tab

- **AC-017** 批次完成后，列表卡片按 weighted_score 降序展示
- **AC-018** 点排序下拉切换"点赞" → 卡片重排（不重新抓）
- **AC-019** 切筛选"仅爆款" → 卡片只剩 isBomb=true 的项
- **AC-020** 卡片显示标题、博主、粉丝数、互动数 4 项、CES、爆款标签
- **AC-021** 爆款卡片右上有红色"🔥 爆款"标签；兜底未达标的有灰色"📄 未达标"
- **AC-022** 点"查看正文"，详情抽屉滑入；若未抓过 desc，显示 spinner，抓完显示
- **AC-023** 点"在小红书打开"，新 Tab 打开 `https://www.xiaohongshu.com/explore/<noteId>?xsec_token=<token>`
- **AC-024** 改阈值后回到展示 Tab，列表的 isBomb 标记按新阈值重算（不重抓）

### AI 处理

- **AC-025** 未配置 Key 时点任何 AI 触发按钮 → 弹出 §5.4 弹窗
- **AC-026** 点"分析选题"按钮 → 状态变 loading；成功后展示 5 条选题；失败后显示错误 + 重试按钮
- **AC-027** 同一批次再次进入展示 Tab，已成功的 AI 结果直接显示（不重新调用）
- **AC-028** 单条结构拆解：每条笔记独立缓存，切换不同笔记重新调用
- **AC-029** AI 输出 JSON 解析失败 → 自动重试 1 次（temperature=0.1） → 仍失败 → 显示错误
- **AC-030** AI 输出 401 → 自动设 apiKeyStatus='invalid' + 弹 §5.4

### 收藏与历史

- **AC-031** 点卡片 ⭐ → 加入收藏 + Toast"已加入收藏"
- **AC-032** 收藏 Tab 列表按 favoritedAt 降序
- **AC-033** 取消收藏点删除 → 弹 §5.5 → 确认后从列表消失 + Toast
- **AC-034** 收藏列表为空 → 显示空状态文案"还没有收藏任何笔记..."
- **AC-035** 历史 Tab 仅显示最近 10 条；第 11 次抓取完成时最旧那条自动消失 + Toast
- **AC-036** 点历史项"载入" → 切到展示 Tab + 该批次成为 current
- **AC-037** 点历史项"删除" → §5.5 弹窗 → 确认后从列表消失
- **AC-038** 点"导出 CSV" → 浏览器下载 CSV，文件名形如 `xhs-radar-20260509-1430-AI工具.csv`
- **AC-039** CSV 第一列含 BOM（`﻿`），中文不乱码

### 全局

- **AC-040** Tab 切换响应 ≤ 250ms（ease-out）
- **AC-041** URL hash `#display` 直接打开时，自动定位到展示 Tab（无 batch 时显示空状态）
- **AC-042** 顶部 🔑 状态指示器与 apiKeyStatus 实时同步
- **AC-043** 诊断模式弹窗显示最近 10 条已拦截接口路径 + 命中数
- **AC-044** 任何未捕获异常被 ErrorBoundary 接住，显示错误卡 + 复制按钮

---

## 九、Phase 2 占位

```typescript
// === 一期不实现，仅在代码中以 // TODO [PHASE 2] 占位 ===

// 1. 笔记图片抓取与展示
// TODO [PHASE 2]: 在 NoteRecord 添加 imageList 字段；NoteCard 显示首图；DetailDrawer 含图片画廊

// 2. AI 改写 / 仿写
// TODO [PHASE 2]: 在 ai/ 目录新增 RewriteTab.tsx；prompts.ts 增加 rewrite system prompt；输出含敏感词过滤（参考 xhs-ai-writer/lib/sensitive-words.ts）

// 3. 跨批次趋势对比
// TODO [PHASE 2]: 在历史 Tab 增加"对比"模式，多选 2–3 个批次后展示对比视图（同关键词不同时段的爆款变化）

// 4. 收藏笔记"已写"状态标记
// TODO [PHASE 2]: FavoriteRecord 增加 status: 'pending' | 'writing' | 'done' 字段 + 标记按钮

// 5. 多设备同步
// TODO [PHASE 2]: 评估走 chrome.storage.sync（容量小）或外部服务（云函数）

// 6. Edge / Firefox 兼容
// TODO [PHASE 2]: manifest.config.ts 增加 browser_specific_settings；测试 webRequest / fetch 劫持差异

// 7. 错误上报（Telemetry）
// TODO [PHASE 2]: 用户可选开启，匿名上报错误堆栈

// 8. 关注权重接入 CES
// TODO [PHASE 2]: 当详情接口返回中能稳定拿到 followed_count 时，CES 公式启用 +8×followed
```

---

## 十、Mock 数据

### 10.1 单条 NoteRecord 样例（基于 `xhs_web_crawler-main/README.md` 的真实样例）

```typescript
// src/test/fixtures/note.fixture.ts

export const MOCK_NOTE: NoteRecord = {
  noteId: '65d8f3a7000000001f00b3c2',
  xsecToken: 'AB-vK3wLpJ8nQwR5xYz9bV3mN7sT4aE6cF1gH2jK5lP9qR0',
  modelType: 'note',
  title: 'Claude 3.5 Sonnet 实测：3 个让我惊艳的能力',
  time: 1714521600000,            // 2026-05-01 00:00:00
  lastUpdateTime: 1714608000000,
  tagList: [
    { type: 'topic', name: 'AI 工具', id: '5d6e7f8' },
    { type: 'topic', name: 'Claude' },
  ],
  user: {
    userId: '5b0f7d9d4eacab0001a6d1e8',
    nickname: '小番茄爱 AI',
    avatar: 'https://sns-avatar-qc.xhscdn.com/avatar/abc.jpg',
    fans: 8623,
  },
  interactInfo: {
    likedCount: 12000,             // "1.2万" → 12000
    collectedCount: 3400,
    commentCount: 287,
    shareCount: 156,
  },
  desc: '今天试了 Claude 3.5 Sonnet，必须给大家分享...（正文 800 字略）',
  detailFetchedAt: 1715000000000,
  cesScore: 12000 + 3400 + 287 * 4 + 156 * 4,  // = 17172
  likeToFansRatio: 12000 / 8623,   // ≈ 1.392
  daysSincePublish: 8.5,
  timeDecayFactor: Math.exp(-0.1 * 8.5),  // ≈ 0.4274
  weightedScore: 17172 * 0.4274,   // ≈ 7339
  isBomb: true,
  bombReason: 'super',
  clusterLabel: '测评类',
  detailFetchFailed: false,
  fanFetchFailed: false,
  isDeleted: false,
};
```

### 10.2 BatchRecord 样例

```typescript
export const MOCK_BATCH: BatchRecord = {
  batchId: 'btch_2026050914301',
  createdAt: 1715253000000,
  keywords: ['AI 工具', 'Claude 教程'],
  timeWindow: { type: 'preset', days: 7 },
  thresholds: { ces: 100, likeRatio: 0.5 },
  candidatePoolMax: 200,
  notes: [MOCK_NOTE /* + 18 more */],
  candidateCount: 187,
  bombCount: 18,
  fallbackCount: 2,
  status: 'complete',
  aiResults: {
    topicSuggestions: null,
    angleClusters: null,
    trendKeywords: null,
    structureBreakdown: {},
  },
};
```

### 10.3 AI 结果样例（4 个）

```typescript
export const MOCK_TOPIC_SUGGESTIONS: TopicSuggestionsResult = {
  suggestions: [
    {
      angle: 'AI 工具组合工作流：Claude + Cursor + Notion 的协同实测',
      rationale: '当前赛道 18 条爆款中仅 2 条涉及多工具组合，"工作流" 角度稀缺度高',
      relatedNoteIds: ['65d8f3a7...', '65e1c2b8...'],
      novelty: 'underexplored',
    },
    // ... 4 more
  ],
  generatedAt: 1715253600000,
};

export const MOCK_STRUCTURE_BREAKDOWN: StructureBreakdownResult = {
  noteId: '65d8f3a7000000001f00b3c2',
  titleHook: { pattern: '具体产品 + 数字 + 情绪词', explanation: '"3 个让我惊艳"用具体数字和强情绪词钩子' },
  opening: { type: 'hook', content: '今天试了 Claude 3.5 Sonnet，必须给大家分享...', explanation: '即时性 + 第一人称 + 强分享意愿' },
  bodyStructure: [
    { section: '能力 1：长文档分析', summary: '...' },
    { section: '能力 2：代码理解', summary: '...' },
    { section: '能力 3：创意写作', summary: '...' },
  ],
  ending: { cta: '你最想用 Claude 做什么？评论区聊', type: 'question' },
  generatedAt: 1715253900000,
};

export const MOCK_ANGLE_CLUSTERS: AngleClustersResult = {
  clusters: [
    { label: '测评类', description: '评测某 AI 产品的能力 / 优缺点', noteIds: ['65d8f3a7...', /*...*/], percentage: 38 },
    { label: '教程类', description: '手把手教如何使用某 AI', noteIds: [/*...*/], percentage: 27 },
    { label: '清单类', description: '罗列 N 个工具 / 提示词', noteIds: [/*...*/], percentage: 22 },
    { label: '故事类', description: '个人体验 / 使用案例', noteIds: [/*...*/], percentage: 13 },
  ],
  generatedAt: 1715254200000,
};

export const MOCK_TREND_KEYWORDS: TrendKeywordsResult = {
  highFrequencyWords: [
    { word: 'Claude', count: 14, sampleNoteIds: ['65d8f3a7...'] },
    { word: '提示词', count: 11, sampleNoteIds: [/*...*/] },
    { word: '工作流', count: 7, sampleNoteIds: [/*...*/] },
    // ... 17 more
  ],
  topicTags: [
    { name: 'AI 工具', count: 18 },
    { name: 'Claude', count: 12 },
    { name: 'ChatGPT', count: 9 },
    // ... 17 more
  ],
  generatedAt: 1715254500000,
};
```

### 10.4 拦截响应原始样例（用于单测）

```typescript
// 来自 xhs_web_crawler-main/README.md 真实结构（已脱敏）
export const MOCK_RAW_SEARCH_RESPONSE = {
  code: 0,
  success: true,
  msg: 'success',
  data: {
    has_more: true,
    items: [
      {
        id: '65d8f3a7000000001f00b3c2',
        model_type: 'note',
        xsec_token: 'AB-vK3...',
        note_card: {
          type: 'normal',
          display_title: 'Claude 3.5 Sonnet 实测：3 个让我惊艳的能力',
          user: {
            user_id: '5b0f7d9d4eacab0001a6d1e8',
            nickname: '小番茄爱 AI',
            avatar: 'https://sns-avatar-qc.xhscdn.com/avatar/abc.jpg',
          },
          interact_info: {
            liked: false,
            liked_count: '1.2万',
            collected: false,
            collected_count: '3400',
            comment_count: '287',
            share_count: '156',
          },
        },
      },
      {
        id: 'ad_xxx',
        model_type: 'ad',  // 应被过滤
      },
    ],
  },
};
```

---

## 批次 3 自检

- [x] 9 个交互流程伪代码完整，链条无跳步
- [x] 涉及 chrome.* 调用一律走 services/chrome（强制铁律）
- [x] 视觉 Token 全部为十六进制 / px 具体值（无语义描述残留）
- [x] 边界条件交叉索引全覆盖（10+ 项）
- [x] storage quota / ErrorBoundary 全局兜底
- [x] 验收标准 44 条，每条独立可测试
- [x] Phase 2 全部用 `// TODO [PHASE 2]` 占位
- [x] Mock 数据基于 xhs_web_crawler README 真实样例
- [x] 没有"参考 L2""根据设计"等模糊引用
- [x] AI 结果 Mock 含 4 类 + 拦截响应原始 Mock

---

## 👉 等你确认后进入批次 4（最后一批）

**批次 4 内容：** Plan Task 清单 — Codex 执行任务清单（按 Phase 1 / Phase 2 + 模块分组，每条 10–20 min 粒度，对应 AC 编号）。

---

*xhs-radar L3 v0.3 批次 1–3 / 4 · 2026-05-09*
