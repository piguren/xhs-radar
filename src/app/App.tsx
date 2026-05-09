// 占位 — Phase 1.4 / 1.12 会替换为完整路由 + 组件树
// 对应 docs/prd/xhs-radar-l3.md §1.5（运行时层级）

export default function App(): React.ReactElement {
  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-brand-500">📡 xhs-radar</h1>
        <p className="mt-3 text-sm text-neutral-700">赛道爆款雷达 · 脚手架就绪</p>
        <p className="mt-1 text-xs text-neutral-500">
          Phase 1.0 完成 · 后续路由与组件树将于 Phase 1.4–1.12 实现
        </p>
      </div>
    </main>
  );
}
