# xhs-radar 赛道爆款雷达

> Chrome 扩展 · 在小红书任意赛道发现"爆款笔记" + AI 辅助选题

![status](https://img.shields.io/badge/status-Phase_1.7_alpha-orange)
![license](https://img.shields.io/badge/license-未定-lightgrey)

## ⚠️ 当前状态：alpha，还没人在真实浏览器里跑通过

代码层面 Phase 1.0–1.7 完成，**158 个测试 / typecheck / build 全绿**，但**端到端浏览器联调（T-077）尚未完成**。可能遇到以下 3 个我们已识别但未在浏览器验证的问题：

1. 多关键词抓取时切换关键词后短暂收不到数据（首次刷新后 ~600ms）
2. 详情接口 SW ↔ content script 中转的真实跨 tab 时序未验证
3. MAIN-world fetch 劫持注入 lazy（已加 200ms 延迟兜底，但未真实验证）

如你愿意试用并反馈，请帮在 issue 里贴**浏览器 console + 扩展 SW console** 截图，我们改后会更新这里。

---

## 这是什么

在小红书搜索某个关键词时，自动捕获后端返回的笔记数据（搜索接口 + 详情接口），按你设的阈值筛"爆款"（高互动、高点赞粉丝比、近时间窗口），并支持用 DeepSeek API 辅助生成选题建议。

**核心特点：**

- ✅ **被动拦截，零主动请求** — 不会触发小红书风控（注意：关键词 navigation 仍是显式跳转）
- ✅ **数据全本地** — 所有抓到的笔记都存在 `chrome.storage.local`，不上传任何服务器
- ✅ **BYOK** — DeepSeek API Key 你自己填，本地存储，扩展不知道也不上传
- ✅ **赛道通用** — 默认零内置词库，每个用户配自己的关键词

**一期 MVP 功能：**

- 配置 Tab：设关键词、时间窗口、阈值、目标爆款数
- 抓取 Tab：实时显示候选数 / 爆款数 / 当前关键词，底部状态条
- AI 选题 Tab（Phase 1.9 后实现）：基于爆款笔记生成选题建议

---

## 普通用户：如何安装

### Step 1 — 拿到代码

**方法 A（推荐，能跟着更新）：**

```bash
git clone https://github.com/piguren/xhs-radar.git
cd xhs-radar
git checkout feat/phase-1   # 一期 MVP 在这个分支
```

**方法 B（懒人，下载 ZIP）：**

1. 打开 https://github.com/piguren/xhs-radar
2. 上方分支 dropdown **切到 `feat/phase-1`**（不是 main，否则下到的是空壳）
3. 点 `Code` 绿按钮 → `Download ZIP`
4. 解压到任意目录

### Step 2 — 安装 Node 依赖 + 编译扩展

需要 Node 18+ 和 pnpm。装过的跳过：

```bash
# 没装 pnpm 的：
npm install -g pnpm

# 进入项目目录：
pnpm install
pnpm build
```

完成后会在项目根生成 `dist/` 目录 —— 这就是要加载到 Chrome 的扩展。

### Step 3 — 加载到 Chrome

1. 打开 Chrome，地址栏输入 `chrome://extensions`
2. 右上角开**开发者模式**
3. 点**加载已解压的扩展**，选**项目下的 `dist/` 目录**（不是项目根，是 dist）
4. 看到 "xhs-radar 赛道爆款雷达 0.1.0" 就装好了

### Step 4 — 用

1. 打开 https://www.xiaohongshu.com 并**确保已登录**（顶部要有你的头像）
2. 浏览器右上角点 xhs-radar 扩展图标 → **打开 Dashboard**（会开一个全屏 Tab）
3. **配置 Tab**：
   - 关键词：可以加多个，例如 `AI 工具`、`效率工具`、`AI 产品经理`
   - 时间窗口：近 3 / 7 / 30 天
   - 阈值：CES（综合互动分）、点赞粉丝比
   - 目标爆款数：5 是合理起点
   - 候选池上限：200（达到自动停）
4. 点**开始抓取**
5. 自动切到**抓取 Tab**，底部状态条显示进度。等它跑完（候选满 200 / 满足目标爆款数 / 所有关键词扫完）
6. 到**展示 Tab** 看爆款列表（Phase 1.8 实现，当前可能为空壳）

---

## 开发者：如何改代码

```bash
git clone https://github.com/piguren/xhs-radar.git
cd xhs-radar
git checkout feat/phase-1
pnpm install
pnpm dev          # 启 Vite dev server（带 HMR）
pnpm test         # 跑全量测试
pnpm typecheck    # tsc 类型检查
pnpm build        # 编译生产 dist/
```

**项目结构：**

```
src/
├── app/                  # React 层（Dashboard 全屏 Tab）
│   ├── components/       # UI 组件（config / shared / nav）
│   ├── hooks/            # useScrapeListener 等
│   └── store/            # zustand stores
├── services/             # 业务逻辑层
│   ├── chrome/           # chrome.* API 抽象
│   ├── orchestrator/     # 抓取编排（state machine / candidate pool / handleStartScrape）
│   ├── scoring/          # CES 评分 / 时间衰减 / 爆款判定
│   └── xhs/              # 小红书接口 schema / parser / interceptor / fetcher
├── shell/                # Chrome 扩展边界
│   ├── service_worker.ts # 后台 SW 主入口
│   ├── content_scripts/  # ISOLATED 世界 content script
│   ├── popup/            # 扩展图标 popup
│   └── dashboard_entry   # 全屏 Tab 入口
└── types/                # 跨层共享类型
```

**文档：**

- `docs/prd/xhs-radar-l1.md` 产品大纲
- `docs/prd/xhs-radar-l2.md` 传统 PRD
- `docs/prd/xhs-radar-l3.md` Coding PRD（schema / AC / 测试）
- `docs/plans/xhs-radar-phase1.md` Phase 1 实施 Plan（5 步 TDD 详写）

---

## 隐私 / Cookie 说明

**这个扩展会做什么：**
- 在 `*.xiaohongshu.com` 域下注入 content script + MAIN-world 脚本
- 劫持 `window.fetch` 和 `XMLHttpRequest`（仅匹配 search / feed / user_info 三个 API）
- 把响应原样转发给扩展自己的 service worker 做解析、评分、存到 `chrome.storage.local`

**这个扩展不会做什么：**
- ❌ 上传任何数据到任何服务器
- ❌ 修改你在小红书上看到的内容（不注入 DOM、不改请求 body）
- ❌ 自动点赞、评论、关注（不会"操作"，只"读取"）
- ❌ 在你没登录时尝试登录，不偷 cookie

**DeepSeek API Key：**
- 完全可选，仅 AI 选题功能需要
- 仅存 `chrome.storage.local`，仅扩展自己 fetch 调用
- 不在源码里，不在任何 commit 里

---

## 已知问题（T-077 alpha）

| # | 问题 | 状态 |
|---|---|---|
| 1 | 多关键词切换 ~600ms 收不到数据 | 已加延迟兜底，未真实验证 |
| 2 | 详情接口 SW↔CS 跨 tab 时序 | 已实现，未真实验证 |
| 3 | MAIN-world 劫持注入 lazy | 已加 200ms sleep，未真实验证 |
| 4 | 验证码 461 处理流 | 单测覆盖，浏览器未验证 |
| 5 | 展示 Tab UI | Phase 1.8 任务，当前空壳 |

如试用碰到任何一个，欢迎在 issue 里告诉我们。

---

## 测试 & 质量门

- **158 个测试**（vitest），涵盖 33 个测试文件
- **typecheck**：tsc strict 模式无错
- **build**：vite + crxjs 产 MV3 扩展 + zip 包
- 每个 commit 跑 typecheck + vitest + build 三连质量门

```bash
pnpm test:run     # 跑一次（CI 模式）
pnpm typecheck
pnpm build
```

---

## License

未定。先以个人/学习用途为前提，**禁止用于任何商业爬虫服务**。

---

## 致谢 / 参考项目

技术参考（仅 schema / 接口形态参考，不抄代码）：
- [Spider_XHS](https://github.com/cv-cat/Spider_XHS) — Python 端 xhs API schema 参考
- [xhs_web_crawler](https://github.com/EasyJailbreak/xhs_web_crawler) — chrome 扩展形态参考
- [xiaohongshu-bomb-finder](https://github.com/...) — 爆款判定逻辑参考

方法论：基于私有 Skill `idea-to-coding-plan-v2`（PRD → Plan → 5 步 TDD）端到端实施。
