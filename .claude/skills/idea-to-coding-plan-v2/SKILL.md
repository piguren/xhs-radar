---
name: idea-to-coding-plan-v2
description: 从模糊想法到可执行 Coding Plan 的端到端流程。四阶段：A 需求采集 / B 静态规格（L1+L2+L3 §1-10）/ C 可执行计划（writing-plans 格式）/ D 交接执行。Spec 与 Plan 双产物分离，互不污染。深度融合 superpowers 套件的行为塑造原则。
---

> **版本：** v2.3（v2.2 + 真实联调暴露的契约偏差铁律 / 来自 xhs-radar T-069）
> **适用：** 需要从产品想法走到可让 AI Agent 自动执行的 Coding Plan 的项目。

## 概述

本 Skill 是 [`idea-to-prd-v1`](../idea-to-prd-v1/SKILL.md) 的进阶版，核心改进：

1. **把"静态规格"和"可执行计划"拆为两份独立产物**：
   - **Spec（L1/L2/L3 §1–10）：** 类型、契约、AC、架构、Mock — 启动时读一次，过程中偶尔回查
   - **Plan（独立 Plan 文件）：** 文件 × 步骤 × 完整代码 × 测试 × 命令 — 实施方逐 Task 严格跟随

2. **深度融合 superpowers 套件**：writing-plans / executing-plans / subagent-driven-development / test-driven-development / using-git-worktrees / finishing-a-development-branch 的行为塑造原则全部内化为本 Skill 的硬性约束。

> **核心信念 1：** "建什么"和"怎么一步一步建"是两个不同抽象层。混在一份文档里会让两者都失焦。
> **核心信念 2：** 行为塑造大于格式合规。Skill 的强度决定 Agent 的纪律。

**输入：** 任意形式的需求（一句话、草图、截图均可）
**输出：**
- `docs/prd/<feature>-l1.md` — 产品大纲
- `docs/prd/<feature>-l2.md` — 传统 PRD
- `docs/prd/<feature>-l3.md` — 架构 + 类型 + AC（**不含执行步骤**）
- `docs/plans/<feature>-phase1.md` — 可执行 Plan（writing-plans 格式 / TDD 五步骤 / 完整代码）
- 全部存入 GitHub `docs/`

---

---

# 🧪 Phase D 实战陷阱与铁律（来自首次端到端实施 2026-05）

> 这一节是 v2.1 → v2.2 的关键升级。前面的方法论再完美，没有这些"操作层"的具体陷阱，实施 Agent 还是会反复踩坑。

## 1. 跨层类型必须独立成 `src/types/`，不挂 store

**踩过的坑：** L3 §1.4 把 `NoteRecord` 写在 `app/store/batchStore.ts` 命名空间下；但 `services/scoring/filter.ts` 也需要 `NoteRecord` → 形成 `services → app` 反向依赖，违反"形态无关"铁律。

**铁律：**
- 任何 ≥2 层用到的类型 → 抽到 `src/types/<domain>.ts`
- `services/` 引用 `types/` ✅；`services/` 引用 `app/` ❌
- L3 §1.4 写 State 类型时同步标注"是否跨层"，跨层即放 `types/`

## 2. 占位文件铁律：被引用的资源必须先存在

**踩过的坑：**
- `manifest.json::web_accessible_resources` 引用 `interceptor_main.js`，但该文件是 T-061 才写的真实内容 → Phase 1.0 build 失败
- `manifest.json::icons` 引用 PNG 文件，但项目还没设计图标 → build 失败

**铁律：**
- 任何被 manifest / config 引用的文件，**必须在第一次 build 之前先放占位**（哪怕是空 IIFE 或临时图标）
- Plan 里 Phase 1.0 的最后一个 Task 应是"build 验证"，确保占位齐全
- 占位文件加 `// 占位 — 真实实现见 T-XXX` 注释，避免被遗忘

## 3. 每个 Phase 必须以"质量门"收尾

**铁律（Plan 强制写进每个 Phase 末尾）：**
```
- [ ] pnpm typecheck   预期: 无错误
- [ ] pnpm vitest run  预期: 全 pass
- [ ] pnpm build       预期: dist 生成，无 ENOENT
```
任意一步失败 → 当前 Phase 不算完成，不许进下一 Phase。

> 这条铁律比单 Task TDD 五步骤更高一阶 — 它防止 Phase 间集成回归。

## 4. 浏览器扩展的"消息网格"模式（Messaging Mesh）

**踩过的坑：** dashboard 想 fetch 小红书接口，但跨域 + 需要 cookie → 必须由 content script 在 xhs.com origin 下发起。链路：

```
Dashboard ──sendMessage──► Service Worker
                                │
                                tabs.sendMessage
                                │
                                ▼
                         Content Script (ISOLATED world)
                                │
                                ├── fetch(同源 + cookie) ────► XHS API
                                │
                                └── injectScript ──► MAIN world IIFE
                                                       │
                                                       fetch hook
                                                       │
                                                       window.postMessage
                                                       │
                                                       ▼
                                                 Content Script (回到 ISOLATED)
                                                       │
                                                       sendMessage
                                                       │
                                                       ▼
                                                 Service Worker / Dashboard
```

**铁律：**
- L3 §1.2 必须有这张图（如果项目是浏览器扩展）
- 每条消息必须有命名常量（`'CONTENT_SCRIPT_FETCH'` 等），集中在 `src/types/messages.ts`
- 链路任何一节都不能省（不能让 dashboard 直接 fetch 跨域接口，会被 CORS 卡）

## 5. MAIN world IIFE 的硬约束

**踩过的坑：** MAIN world 脚本需要劫持 `window.fetch`，但 MAIN world 不能 `import`，不能用 TS 路径别名，不能用 `chrome.*`。

**铁律：**
- MAIN world 文件只能是 `public/<name>.js`（plain JS IIFE）
- 路径常量内联（不能从 `selectors.ts` import）
- 自身用 `var` 变量 + IIFE 包裹防污染
- 加双重注入防护：`if (window.__xxx_intercepted__) return;`
- 与 content script 通信只能 `window.postMessage`
- **不写 .ts 版本试图复用** — 会被 vite 当成模块打包，破坏 IIFE 形态

## 6. 联调测试必须配套"诊断 UI"

**踩过的坑：** T-069 是 manual integration test（必须真实小红书 + 登录），AI Agent 没法自动跑。如果只丢一句"请手动跑"，用户得在 service worker console 手敲消息。体验差到不会被执行。

**铁律：**
- 任何 manual integration Task 必须配一个临时的"诊断 UI"（按钮 + 显示捕获结果 + 复制按钮），让人 30 秒内能完成
- 诊断 UI 可写在 popup 或 dashboard 中的隐藏入口
- 诊断 UI 在主功能完成后**保留**到一期发布前（不要删，是排查工具）
- 配套 Plan Task 的 step 包括"打开 popup → 点按钮 → 滚动 → 复制"具体动作

## 7. 测试反模式与 happy-dom 注意点

**踩过的坑：**
- `screen.getByText(/explode/)` 失败：错误信息同时出现在 `<p>` 和 `<pre>` 里 → "Found multiple elements"
- `chrome` 全局在 happy-dom 默认不存在 → 测试 chrome.* 的代码必须 `(global as any).chrome = {...}` 在 beforeEach
- `vitest` 默认不带 jest-dom matchers → tests/setup.ts 必须 `import '@testing-library/jest-dom/vitest'`

**铁律：**
- 错误 / 状态文本可能多处出现 → 用 `getAllByText` 而非 `getByText`
- 测 chrome.* 代码先在 `beforeEach` mock；推荐做 `tests/helpers/chrome-mock.ts` 共用
- `tests/setup.ts` 加 jest-dom 导入

## 8. 进度快照节奏（Continuous Execution 的细节）

**Skill v2.1 §D.2.6 说"不要在 Task 间问'要继续吗'"**。这没错，但容易理解为"什么都不汇报"。

**实战补丁：**
- 每完成 1–2 个 Phase（不是 Task）→ 给一次进度快照（百分比 + 风险地图 + 接下来选项）
- 快照不问"继续吗"，只汇报已完成 + 接下来 + 关键风险
- 重大风险扫雷后（如 1.6 高风险通过单元测试）→ 强制做一次 checkpoint，不要直接吞下进 1.7
- 长时间无进度（>5 min 单步骤无 commit）→ 简短说明在做什么，避免 silent

## 9. Plan 自检升级（v2.2 新增 3 条）

在原 §C.6 Plan 自检基础上加：

- [ ] **依赖顺序审查：** 每个 Task N 的 imports 是否都来自 Task ≤ N？跨 Phase 的尤其要查。
- [ ] **占位文件审查：** 每个 manifest/config 引用的资源是否在被引用前已有占位？
- [ ] **质量门收尾：** 每个 Phase 末尾是否有 typecheck + vitest + build 三连？

## 10. Plan 字段约定

**踩过的坑：** Plan 写 `Files: Create: ...` 但没写"被哪个 Task 后续修改"，导致后续任务里说"修改 src/X.ts"时可能跟之前 Create 的版本冲突。

**铁律：**
- Files 段加上 `Modify: <path> by T-XXX, T-YYY` 注明所有后续修改方
- 修改密集的文件（>5 次修改）应在文件顶部加 changelog 注释
- Plan 末尾给一张 "File × Task" 矩阵，谁动谁建一目了然

## 11. Schema 真相来源优先级 `[universal]`

**踩过的坑：** xhs-radar Phase 1.6 写 search 接口 schema 时参考了 7 个开源项目的 README/sample/源码，全部用 `share_count`。Phase 1.6 末尾真实联调（T-069）才发现线上字段是 `shared_count`（带 d）—— 21 条响应里 21 条都丢失分享数。同一份响应还暴露 `corner_tag_info[].text`（含 publish_time）完全没在任何 ref README 里出现，导致 NoteRecord.time 一直硬编码 0。

**铁律：** Schema 来源优先级 = **真实响应 > 官方文档 > 参考项目源代码 > 参考项目 README**。

**正确做法：**
- L3 §3 Schema 章节必须配"真实响应来源"声明：抓取入口 / 抓取日期 / 是否亲自验证
- 写 schema 第一步：要求自己/用户抓 1 份真实响应（或在 ref 项目里翻已抓样例文件，不是文档）
- ref README/sample 字段名只能作为"提示"，不能作为"真相"——任何 ref 都可能因接口改名而过时
- 多个 ref 项目字段一致也不构成 schema 真相，只能延后被真实响应推翻的概率

## 12. 被动拦截类项目：fixture 早存，集成测试不拖到 Phase 末 `[browser-ext]`

**踩过的坑：** xhs-radar Phase 1.6 把"真实联调"安排成最后一个 Task（T-069），search_parser（T-064）写完后到 Phase 末才发现 schema 错。中段写过的 9 个边界 case TC（A1-T1~T9）全部基于错 fixture——9 个测试都通过但都在错的契约上"绿"。

**铁律：** 任何依赖外部接口响应的项目，必须在 parser **第一个 Task 完成前**存一份真实响应 fixture，集成测试在 Phase 中段就跑，不拖到 Phase 末。

**正确做法：**
- Plan 的第一个解析类 Task（T-XX0）之前 / 同期安排 "fixture capture" Task：手动抓 1 份真实响应存 `test-fixtures/`
- 集成测试随 fixture 即写：`real_<api>_response.test.ts`，断言"长度 > 0 + 关键字段非默认值"
- 后续每个 parser Task 都跑这个集成测试，错就立刻暴露而不是等到 Phase 末
- "fixture capture" Task 暂时拿不到真数据可 skip，但 Task 必须存在；它的存在会迫使节奏重排

## 13. 硬编码 0/null/'' 兜底是契约偏差的伪装 `[universal]`

**踩过的坑：** xhs-radar `search_parser.ts` 写过 `time: 0`、`shareCount: parseCount(ii.share_count)`（字段名错时返回 0）、`title: card.display_title ?? ''`。这些"安全兜底"让 TS 类型不报错、单测全过，真实响应跑过来就是全 0 数据。直到加"shareCount > 0 + time > 0"的契约断言才暴露契约偏差。

**铁律：** 凡是 Domain 类型（NoteRecord 等）上"应当能从外部解析出来"的字段，必须有契约测试断言它**非默认值**（用真实 fixture 驱动）。

**正确做法：**
- L3 §4 测试章节给每个"应当被解析"的字段定一条"非默认值"断言（如 `expect(time).toBeGreaterThan(0)`）
- 解析器集成测试必须断言"至少一条字段非 0/非 null/非空串"，构造 fixture 不算
- 任何 `?? 0` / `?? null` / `?? ''` / `?? 0n` 兜底都要回答："如果真走到这一支意味着什么？"——若意味着契约偏差就要有告警/测试断言
- 单测可以用任意 fixture，**集成测试必须用真实 fixture 驱动这些"非默认值"断言**

---

# 🔍 参考成熟项目原则（贯穿四阶段）

> **铁律：在动手写任何代码 / 配置 / 架构决策之前，先盘点工作区或仓库里的"成熟参考项目"。** 不要重新发明已经被踩过坑的模式。

## 触发时机（每阶段都要做）

| 阶段 | 时机 | 怎么做 |
|---|---|---|
| **Phase A 需求采集** | 7 维度第 5 项「现有方案」、第 7 项「参考与竞品」 | 列出工作区 / 同 owner 仓库内类似产品；摘录其取舍 |
| **Phase B 静态规格** | 决定技术栈 / 架构形态前 | 找 1–3 个最相似的成熟项目，对比其选型；L3 §3 / §4 / §10 的 Mock 数据优先抄真实样例 |
| **Phase C 可执行计划** | 写 Task 文件结构前 | 在 Plan 顶部 "Reference Projects" 段列明：哪些文件模式抄自哪个项目；哪些 service/util 模式可复用 |
| **Phase D 交接执行** | scaffolding 任务（如 T-001 ~ T-008）开始前 | 主控 Agent 先做 5–10 分钟的 pattern survey；把发现表（"哪些直接抄 / 哪些需要改 / 哪些不抄"）写到执行日志 |

## Pattern Survey 模板（在 Phase D scaffolding 前必填）

```markdown
## 参考项目盘点

| 参考项目 | 直接抄 | 需要改 | 不抄（不适用） |
|---|---|---|---|
| <project-name> | 配置 / 工具函数 / 类结构 | 适配本项目的具体差异 | 与本项目形态不符的部分 |
```

完成此表后才能进入 T-001（脚手架第一步）。**没有这一步，scaffolding 容易闭门造车，与生态脱节。**

## 反模式

❌ 不做 survey 直接 scaffold（容易选过时栈 / 漏掉社区已解决的坑）
❌ 抄整个项目而不做适配（形态不同的部分照搬会害你）
❌ 把"成熟项目"理解成"任何项目"（要选最相似的 1–3 个，不是泛读）
❌ 把 survey 结果埋在脑子里不落地（必须在 Plan 或执行日志里有显性表格）

## 优先选哪些参考

1. **同工作区已有的相似项目**（最优 — 同等约束）
2. **同 owner / 同公司的内部项目**（约束相近）
3. **GitHub 上 ⭐ 高的开源项目**（社区验证）
4. **官方示例 / starter template**（最弱 — 可能过简）

## 与 L3 §10 Mock 数据的联动

L3 §10 的 Mock 数据**必须**取自参考项目的真实响应样例（已脱敏）。禁止自己编造，因为字段命名、嵌套结构、可空性这些细节是接口契约的一部分，编造容易让后续 parser 跑不起来。

---

## HARD-GATE（硬性门槛）

> ⛔ Phase A 完成前不得输出任何文档
> ⛔ L1 用户确认前不得开始 L2
> ⛔ L2 用户确认前不得开始 L3
> ⛔ L3 用户确认前不得开始 Plan
> ⛔ Plan 通过四层一致性检查 + 用户确认 + 存入 GitHub 前不得宣告交接完成
> ⛔ 在 main / master 上启动实施前必须创建 worktree / feature branch
> ⛔ Phase D scaffolding 第一个 Task 启动前必须完成「参考成熟项目盘点」表（见上方 § 参考成熟项目原则）

---

## 调用决策树

```
收到任务
    │
    ├─ 有现成 L1/L2？
    │     → 询问：(A) 直接精化到 L3+Plan？(B) 先做 7 维度评估对齐？
    │
    ├─ 用户说「需求很简单，直接出 Plan」？
    │     → 「我先快速做 7 维度评估，确保 Plan 不偏。」
    │
    ├─ 已有 L3 §11（旧 PRD）但想要正规 Plan？
    │     → 跳过 Phase A/B，进 Phase C：把 §11 升级为 writing-plans 格式（独立文件）
    │
    └─ 其他 → 从 Phase A Step 1 开始
```

---

# Phase A：需求采集

> 与 idea-to-prd-v1 一致，参考其 Step 1–2 全部细则。

### A.1 范围评估

判断标准：单 PRD 工作量 ≤ 2–4 周。超过则拆分。

### A.2 接收任意形式输入

接受一句话、大白话、截图、草图。

### A.3 7 维度评估（必须直接展示）

| # | 维度 | 优先级 |
|---|---|---|
| 1 | 背景与痛点 | 必须 |
| 2 | 业务目标 | 必须 |
| 3 | 用户与场景 | 必须 |
| 4 | 核心用户旅程 | 必须 |
| 5 | 现有方案 | 重要 |
| 6 | 业务规则 | 重要 |
| 7 | 参考与竞品 | 加分 |

### A.4 至少 3 轮深度追问【每轮等待用户回复】

- 每轮 3–5 个**开放式、启发式**问题
- 第 1 轮聚焦"为什么 + 谁来用"
- 第 2 轮聚焦"怎么用"
- 第 3 轮聚焦"怎么算做好了 + 一/二期边界"

> 任何阶段如果用户对设计决策提出疑问 → 进入**连环拷问模式**，2–4 个追问澄清后同步更新当前层文档。

### A.5 需求确认【等待用户确认】

必须维度（1–4）全部清晰后：
1. 结构化复述 7 维度最终理解
2. 确认一期/二期边界
3. 等用户回「对的，开始写」

### A.6 方案提议

提 2–3 个产品方案（核心思路 / 优缺点 / 推荐），等用户选定。

---

# Phase B：静态规格（L1 / L2 / L3）

## B.1 L1 产品设计大纲

**目标读者：** 全体（含非技术）
**写作规则：** 纯自然语言，零技术术语，每段 ≤150 字
**必须包含：** 文档索引 / 背景与目标 / 用户角色与场景（含 Mermaid 流程图）/ 功能全貌 / 模块划分 / 一期二期范围 / 关键约束

**L1 自检：** 无 TBD ✅ / 无技术术语 ✅ / 非技术者可懂 ✅ / 一二期边界清晰 ✅

## B.2 L2 传统 PRD（一份整体，不拆前后端）

**写作规则：** 交互写"触发条件 → 动作 → 结果"三段式
**必须包含：** 页面结构 / 各区块详情（展示+交互+各状态）/ 字段与数据来源 / 状态与边界 / 弹窗与流程 / 视觉规范（语义） / 外部接口依赖（业务层描述）

**L2 自检：** 三段式齐全 ✅ / 无"根据实际情况"等模糊词 ✅ / 状态全覆盖 ✅ / 字段有来源 ✅ / 与 L1 范围对应 ✅

## B.3 L3 Coding PRD（§1–10，**不含执行步骤**）

**目标读者：** 实施方 + 工程师
**写作原则：** 消除歧义 / 类型优先 / Phase 2 用 `// TODO [PHASE 2]` 占位

> ⚡ **分批输出策略：** L3 按 4 批输出，每批用户确认后续：
> - 批次 1：组件树 + State 定义（§1, §2）
> - 批次 2：API Schema + 请求构造规则 + 测试用例（§3, §4）
> - 批次 3：交互逻辑 + 视觉 Token + 边界 + 验收标准 + Phase 2 + Mock（§5–10）
> - 批次 4：✨ 与 v1 不同 ✨ — **不是 Plan**，而是 §11「执行编排」（指针：Plan 在哪个独立文件）

**L3 必须包含 11 章（注意 §11 升级）：**

1. 组件树
2. State 定义
3. API Schema
4. API 清单 + 请求构造规则 + 测试用例
5. 交互逻辑伪代码（完整链条不允许跳步）
6. 视觉 Token（十六进制 + px 值）
7. 边界条件与错误处理
8. 验收标准（AC-001 格式，每条可独立测试）
9. Phase 2 占位（`// TODO [PHASE 2]`）
10. Mock 数据（基于真实参考样例）
11. **执行编排**：指向 `docs/plans/<feature>-phase1.md` 的指针 + 引用的 superpowers Skills 列表（不写步骤本身）

**L3 自检（13 项）：**

- [ ] 组件树完整 / State 全有类型与初始值 / API Schema 全 / 测试用例齐
- [ ] 交互链条无跳步 / 颜色十六进制 / AC 可独立测试
- [ ] Phase 2 全占位 / Mock 基于真实数据 / 无模糊引用
- [ ] §11 是指针不是步骤 / L3 已存入 GitHub
- [ ] 三层一致性（L1 → L2 → L3）通过

---

# Phase C：可执行计划（writing-plans 格式）

> 输出独立文件 `docs/plans/<feature>-phase1.md`，**不进 L3 文档**。

## C.1 计划文档头（强制格式）

```markdown
# <Feature> Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: 推荐使用 superpowers:subagent-driven-development（有 subagent 时）或 superpowers:executing-plans（无 subagent 时）逐 Task 执行。所有步骤用 `- [ ]` 复选框跟踪。每个实现 subagent 必须严守 superpowers:test-driven-development 铁律。

**Goal:** [一句话描述要建什么]
**Architecture:** [2–3 句技术取向]
**Tech Stack:** [关键技术栈]
**Spec Reference:** docs/prd/<feature>-l3.md（架构 / 类型 / AC 全部在那里）

---
```

## C.2 文件结构（Plan 第一节）

在定义 Task 之前，先列出这个 Phase 涉及的所有文件，每个的职责。**Files that change together should live together.** 按职责分，不按技术层。

## C.3 Bite-Sized Task（每 Task 5 步，2–5 min/步）

```markdown
### Task T-XXX：[组件名]

**对应 AC：** AC-001, AC-003（详见 docs/prd/<feature>-l3.md §8）
**Files:**
- Create: `exact/path/to/file.ts`
- Test:   `exact/path/to/file.test.ts`

- [ ] **Step 1：写失败测试**
  ```typescript
  test('describe expected behavior', () => {
    expect(fn(input)).toBe(expected);
  });
  ```

- [ ] **Step 2：运行验证失败**
  Run: `pnpm vitest run path/to/file -v`
  Expected: FAIL with "fn is not defined"

- [ ] **Step 3：实现最小代码**
  ```typescript
  export function fn(input: T): U {
    // implementation
  }
  ```

- [ ] **Step 4：运行验证通过**
  Run: `pnpm vitest run path/to/file -v`
  Expected: PASS

- [ ] **Step 5：提交**
  ```bash
  git add path/to/file.ts path/to/file.test.ts
  git commit -m "feat(T-XXX): implement <component>"
  ```
```

## C.4 No Placeholders（强制）

每步必须有实际内容。**这些是 Plan 失败信号，绝不允许：**

- "TBD" / "TODO" / "implement later" / "fill in details"
- "Add appropriate error handling" / "handle edge cases"（必须写出具体处理逻辑）
- "Write tests for the above"（必须写出实际测试代码）
- "Similar to Task N"（必须复制完整代码 — 实施方可能跳读）
- 描述要做什么但不展示怎么做（代码步骤必须有代码块）
- 引用未在任何 Task 中定义的类型 / 函数 / 方法

## C.5 Path A / B / C 选项

按风险分级写 Plan，让用户选成本：

| Path | 详写范围 | 工作量 | 适用 |
|---|---|---|---|
| **A 轻量** | 不详写 Plan，依赖 L3 §11 + Skills 现学 | 0 h | 所有 Task 都成熟、低风险 |
| **C 混合** ⭐ 推荐 | 仅高风险 Phase 详写 | 1.5–3 h | 多数项目最佳 |
| **B 全量** | 全部 Task 详写为 5 步骤 | 4–8 h | Codex / 团队首次合作 / 高合规要求 |

询问用户后落到具体 Phase。

## C.6 Plan 自检

- [ ] **Spec coverage：** 每个 AC 都被至少一个 Task 覆盖
- [ ] **Placeholder scan：** Plan 中无 §C.4 的红旗模式
- [ ] **Type consistency：** Task 间用到的类型 / 方法名一致
- [ ] **Files explicit：** 每 Task 有明确 Create / Modify / Test 文件路径
- [ ] **Commands explicit：** 每个 Run 步骤有完整命令 + Expected 输出
- [ ] **Code complete：** 每个代码步骤有完整可运行代码块
- [ ] **AC traceable：** 每 Task 顶部引用对应 AC 编号

## C.7 四层一致性检查

```
L1 → L2 → L3 → Plan
  ↑     ↑    ↑     ↑
  各自 self-check + 邻接层 cross-check
```

- [ ] L1 全部一期功能点 → L2 有对应章节
- [ ] L2 全部字段 → L3 有 TS 类型定义
- [ ] L2 全部接口依赖 → L3 §3/§4 有完整 Schema
- [ ] L3 全部 AC → Plan 有至少一个 Task 覆盖
- [ ] L3 Phase 2 占位 ↔ Plan 不实现这些（Plan 仅 Phase 1）
- [ ] L1 一期范围 ↔ Plan 全部 Task ↔ L3 §11 指针 三处口径一致

---

# 🔥 TDD 铁律（来自 superpowers:test-driven-development）

> **核心信条：**
> *"If you didn't watch the test fail, you don't know if it tests the right thing."*
> 如果你没亲眼看到测试失败，你不知道它测的是不是对的东西。

## 不可触碰的法则

```
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
```

**写代码在测试之前？删掉。重头来。**

无例外：
- ❌ 不能"留作参考"
- ❌ 不能"边写测试边调整代码"
- ❌ 不能"看一眼再写"
- ✅ 删掉就是删掉

从测试出发重新实现。**就这样。**

## Red-Green-Refactor 循环

```
RED   → 写失败测试 → 验证它"正确地失败"（失败原因符合预期）
GREEN → 写最小代码 → 验证它通过 + 全部其他测试也绿
REFACTOR → 整理代码 → 保持绿
```

> **违反字面规则就是违反精神规则。**
> 任何"我懂这个规则的精神，所以我可以这样跳过一下" — 这是合理化，不是合理。

## TDD 例外（必须先问 human partner 同意）

仅以下情形允许跳过 TDD：

- 一次性原型代码（用完即弃）
- 自动生成的代码
- 配置文件

**任何"就这一次跳过 TDD"的念头都要停下。** 这是 rationalization。

---

# Phase D：交接执行（升级版）

## D.0 启动前置（来自 superpowers:executing-plans）

**Step 1：加载并审查 Plan**
1. 读 Plan 文件
2. **批判性审查** — 识别任何疑问或顾虑
3. 如有顾虑：在开始前与 human partner 沟通
4. 如无顾虑：创建 TodoWrite，进入执行

> ⛔ **绝不在 main / master 上启动实施**，除非 human partner 明确同意。

## D.1 三种执行模式选择

| 模式 | 适用 | 引用 Skill |
|---|---|---|
| **Subagent-Driven**（推荐，有 subagent 时） | 同 session、需要并发隔离上下文 | superpowers:subagent-driven-development |
| **Inline Execution**（简版） | 没有 subagent、Plan 简单 | superpowers:executing-plans |
| **Manual** | 不推荐 | — |

## D.2 Subagent-Driven 完整流程（核心）

### D.2.1 每个 Task 三阶段（顺序铁律）

```
┌─────────────────────────────────────────────────────────┐
│  1. Implementer subagent                                │
│     执行 + 测试 + 提交 + 自审                            │
└────────────────┬────────────────────────────────────────┘
                 ▼
┌─────────────────────────────────────────────────────────┐
│  2. Spec Compliance Reviewer subagent                   │
│     检查代码是否符合 spec（Plan + L3）                   │
│  ⛔ 必须先于第 3 步！                                    │
└────────────────┬────────────────────────────────────────┘
                 ▼ Spec ✅
┌─────────────────────────────────────────────────────────┐
│  3. Code Quality Reviewer subagent                      │
│     检查代码质量（命名 / 复用 / 简洁）                   │
└────────────────┬────────────────────────────────────────┘
                 ▼ Quality ✅
            Mark Task complete
```

> 🚨 **顺序铁律：Spec Compliance ✅ 之后才启动 Code Quality 评审。**
> 这是 superpowers:subagent-driven-development 的第一条红线。

### D.2.2 Implementer 状态码（必须按表分流）

| 状态 | 含义 | 主控处理 |
|---|---|---|
| **DONE** | 完成 | → 进入 Spec Reviewer |
| **DONE_WITH_CONCERNS** | 完成但有顾虑 | 读 concern：① 涉及正确性 / 范围 → 先解决 ② 仅观察（"这个文件有点大"）→ 记录后继续 |
| **NEEDS_CONTEXT** | 需要更多上下文 | 主控提供 → 重派同模型 |
| **BLOCKED** | 卡住 | ① 上下文不足 → 补 + 重派同模型 ② 推理需求高 → 升级到更强模型重派 ③ 任务过大 → 拆分 ④ 计划本身错 → escalate human partner |

> **绝不**：
> - 忽视 escalation
> - 让同一模型在条件未变下重试
> - "应该没事吧"硬推过去

### D.2.3 模型选择（节省 cost）

按任务复杂度选 model，**不要默认全用最贵的**。

| 任务特征 | 推荐 model 档次 |
|---|---|
| 触 1-2 文件 + spec 完整 + 主要是机械实施 | cheap fast model |
| 多文件 + 集成 + 模式匹配 | standard model |
| 架构 / 设计判断 / 大范围代码理解 / 调试 | most-capable model |
| Spec compliance review | standard / capable |
| Code quality review | most-capable（这是质量门控） |

**信号：**
- ✅ 1-2 文件、spec 完整 → cheap
- ⚠️ 多文件、需协调 → standard
- 🔴 需设计判断 → most-capable

### D.2.4 上下文管理（关键反模式警告）

> 🚨 **永远不要让 subagent 自己读 Plan 文件。**

主控 Agent 的工作流程：
1. 主控**读一次 Plan**，把所有 Task **完整文本** + **场景上下文** 提取到 TodoWrite
2. 派 subagent 时，把**完整 Task 文本**直接放进 prompt
3. subagent 不需要、也不应该读 Plan 文件本身

**Why：** subagent 上下文是宝贵资源；让他读 Plan 等于浪费 token + 引入污染。主控的工作就是"只给他需要的部分"。

**也绝不**：
- 让 subagent 读完整 PRD（通常只需 L3 的某节）
- 让多个 implementer subagent 并行做同一 Task（冲突）
- 跳过 scene-setting context（subagent 需要知道这 Task 在大流程的哪一环）

### D.2.5 Reviewer 发现问题的处理

```
Reviewer 找到问题
    ↓
Implementer（同一 subagent）修
    ↓
Reviewer 重审
    ↓
重复直到通过
```

> 🚨 **绝不**：
> - Reviewer 找到问题但 Task 标记 complete
> - 让 implementer 自审替代外部 reviewer
> - 修了不让 reviewer 重审就推进
> - "差不多了"过 spec compliance

### D.2.6 Continuous Execution 信条

> **不要在 Task 间停下来问 human partner "要继续吗？"**

human partner 让你执行 Plan 就是让你执行**全部**。

**唯一停下的理由：**
1. BLOCKED 状态无法解决
2. 真歧义阻碍前进
3. 全部 Task 完成

> "应该继续吗？"和过度详细的进度汇报**浪费 human partner 的时间**。
> 他们让你做就做。

## D.3 标准交接消息（贴到新 Session）

```
请按 docs/plans/<feature>-phase1.md 执行 Phase 1 全部 Task。

执行规范（强制）：

1. **不在 main / master 上启动**
   先用 superpowers:using-git-worktrees 创建隔离工作区

2. **Subagent-Driven 模式（推荐有 subagent 时）**
   引用 skill: superpowers:subagent-driven-development
   - 主控读一次 Plan，提取所有 Task 完整文本到 TodoWrite
   - ⛔ 永远不要让 subagent 自己读 Plan 文件
       主控必须把 Task 文本 + 场景上下文塞进派发 prompt
   - 每 Task 三阶段：implementer → spec compliance reviewer → code quality reviewer
   - ⛔ 顺序铁律：spec compliance ✅ 之后才启动 code quality

3. **TDD 铁律（每个 implementer 必守）**
   引用 skill: superpowers:test-driven-development
   - NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST
   - 没看见测试失败 → 不算测试
   - 写代码在测试前 → 删掉重来

4. **状态分流（严格按表）**
   DONE → 进 Spec Reviewer
   DONE_WITH_CONCERNS → 评估 concern 性质
   NEEDS_CONTEXT → 主控补足后重派
   BLOCKED → 上下文 / 模型 / 拆分 / escalate

5. **模型选择**
   1-2 文件机械任务 → cheap model
   多文件集成 → standard model
   架构 / 设计判断 → most-capable model
   Code quality reviewer → most-capable

6. **不要在 Task 间停下来问"继续吗"**
   Continuous execution — 让你执行就执行全部，遇 BLOCKED 才停。

7. **Spec / 类型 / AC 信息**
   以 docs/prd/<feature>-l3.md 为准；联调发现冲突 → escalate human partner

8. **完成全部 Task + 最终 reviewer 通过后**
   引用 skill: superpowers:finishing-a-development-branch 收尾
```

---

# Step 9 — 交接 Codex（标准产出）

```
✅ L1 产品设计大纲 — 完成（vX.X）
   docs/prd/<feature>-l1.md
✅ L2 传统 PRD — 完成（vX.X）
   docs/prd/<feature>-l2.md
✅ L3 Coding PRD — 完成（vX.X，§1–10 + §11 指针）
   docs/prd/<feature>-l3.md
✅ Phase 1 Implementation Plan — 完成（vX.X）
   docs/plans/<feature>-phase1.md
   └─ N 个详写 Task（Path C/B 详写部分）
   └─ 其余 Task 引用 L3 §11 索引
[✅ HTML 原型 — 完成（如有）]

下一步：在新 Session 粘贴 Phase D 交接消息。
```

---

# 🚫 红线清单（强化版）

## 文档制作阶段

❌ 没完成 7 维度评估和至少 3 轮追问就开始写文档
❌ 用户没确认 L1 就推 L2 / 没确认 L2 就推 L3 / 没确认 L3 就推 Plan
❌ 把执行步骤写进 L3（Plan 必须独立文件）
❌ L1 出现代码或技术术语
❌ L3 出现"适当处理""根据实际情况"
❌ Plan 出现 TBD / "implement later" / "similar to Task N"
❌ Plan Task 没引用 AC 编号
❌ Plan 步骤缺代码 / 缺命令 / 缺 Expected
❌ L3 §11 写成步骤而非指针
❌ Plan 复制 L3 内容（应通过 AC 引用反查）
❌ 一次性输出整个 L3（必须分 4 批）
❌ 一次性输出全量 Plan（详写部分应分 Phase）

## 执行阶段（来自 superpowers）

❌ 在 main / master 上启动实施（必须 worktree / feature branch）
❌ 让 subagent 自己读 Plan 文件
   （主控必须提取 Task 完整文本塞进 prompt）
❌ Spec compliance 未 ✅ 就启动 Code quality review
   （顺序铁律 — superpowers 第一条红线）
❌ 跳过 Spec compliance 或 Code quality 评审之一
❌ Reviewer 发现问题但不修就进下一 Task
   （必须修 + 重审 + 通过）
❌ 任何评审 reviewer 找到问题但仍标 Task complete
❌ 让 implementer 自审替代外部 reviewer
❌ 多个 implementer subagent 并行执行同一 Task（冲突）
❌ 在 Task 间停下问 human partner "要不要继续"
   （Continuous execution）
❌ subagent 报 BLOCKED 时不变模型 / 不变上下文重试
❌ 跳过 scene-setting context（subagent 不知 task 在大流程的哪一环）
❌ 让 subagent 读完整 PRD（通常只需要 L3 一小节）

## TDD 铁律违反

❌ 写代码前未先写失败测试
❌ "就这一次跳过 TDD" — 这是合理化，停
❌ 写代码在测试之前但保留它"作为参考"
❌ 边写测试边调整代码
❌ 跳过 superpowers:finishing-a-development-branch 收尾

## 参考项目原则违反

❌ 不做参考项目 survey 直接 scaffold
❌ 在 Phase D 的 Plan 没有「Reference Projects」段
❌ L3 §10 Mock 数据自己编造而非取自参考项目真实响应
❌ 把"成熟项目"理解成泛读（必须 1–3 个最相似的精读）
❌ 抄整个项目结构不做形态适配

## v2.2 实战陷阱违反（高频重灾区）

❌ 跨层共享类型挂在 store 命名空间下（破坏分层）
❌ manifest 引用的资源没有占位就 build（必 ENOENT 失败）
❌ Phase 完成不跑 typecheck + build + vitest 三连质量门
❌ 浏览器扩展项目 L3 §1.2 没有"消息网格图"
❌ MAIN world 脚本写成 .ts 用 import / 路径别名（被打包成模块）
❌ MAIN world 缺 `__xxx_intercepted__` 双重注入防护
❌ Manual integration Task 没有配套诊断 UI
❌ 错误文本可能多处出现却用 `getByText`（应用 `getAllByText`）
❌ 测试用 chrome.* 但没在 beforeEach mock global.chrome
❌ tests/setup.ts 漏 `@testing-library/jest-dom/vitest`
❌ Continuous Execution 理解为"什么都不汇报"，>2 Phase 无进度快照
❌ 高风险 Phase 扫雷后不做 checkpoint，直接吞进下一 Phase
❌ Plan 里 Files 段没标注后续 Modify 方

## v2.3 实战陷阱违反（契约偏差识别）

❌ Schema 字段名只参考 ref 项目 README/源码，不验证真实响应（§11）
❌ L3 §3 Schema 章节没有"真实响应来源 / 抓取日期"声明（§11）
❌ 把"真实联调"Task 安排到 Phase 最后一个位置（§12）
❌ 解析器测试只跑构造的 fixture，不跑真实响应 fixture（§12）
❌ Domain 字段用 `?? 0` / `?? null` / `?? ''` 兜底但没有契约测试断言它非默认值（§13）
❌ 集成测试只断言 "length > 0 / 字段类型对" 不断言 "字段值 ≠ 默认值"（§13）
❌ 蒸馏触发条件命中（高风险 Phase 后）但默认继续下一 Task 而不做蒸馏（meta，写到 CLAUDE.md）

---

# 与 v1 的关键差异

| 维度 | v1 (idea-to-prd-v1) | v2.1 (本 Skill) |
|---|---|---|
| L3 §11 | Plan Task（10–30 min 粒度） | 指针 → 独立 Plan 文件 |
| Plan 格式 | 内嵌 L3，简略 | 独立文件，writing-plans 格式（5 步骤 + 完整代码） |
| TDD 强制 | 软规则 | 铁律 + 删掉重来 + 例外清单 |
| 执行交接 | 文字描述 | Subagent-driven 三阶段 + 状态分流 + 模型选择 |
| 一致性检查 | 三层（L1↔L2↔L3） | 四层（L1↔L2↔L3↔Plan） |
| 反模式警告 | 弱 | 显式 — Reviewer 顺序、上下文管理、Continuous execution、subagent 不读 Plan |
| Red Flags | 一般 | 强化版（结合 superpowers 13 条 Never） |
| 适用场景 | PRD 阶段产物，执行靠经验 | 端到端"产品想法 → 可执行计划 → AI Agent 自律执行" |

---

# Notion 空间组织规范（更新版）

```
📁 [模块名]
  ├── 📄 README（导航入口）
  ├── 📄 L1 产品设计大纲
  ├── 📄 L2 传统 PRD
  ├── 📄 L3 Coding PRD（§1–10 + §11 指针）
  ├── 📁 plans/
  │     └── 📄 Phase 1 Implementation Plan
  └── 📁 后端（如需）
```

---

*idea-to-coding-plan v2.2 · v2.1 + 首次端到端实施实战陷阱蒸馏（消息网格 / MAIN world / 诊断 UI / 质量门 / 类型分层 等 10 项铁律）· 2026-05-09*

*idea-to-coding-plan v2.3 · v2.2 + 契约偏差识别（Schema 真相来源优先级 / 早存真实 fixture / 兜底是契约偏差伪装 共 3 项铁律 + 7 条 Red Flags）· 蒸馏自 xhs-radar T-069 · 2026-05-10*
