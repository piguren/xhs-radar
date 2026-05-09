import { useConfigStore } from '@/app/store/configStore';

export function TargetCountInput(): React.ReactElement {
  const value = useConfigStore((s) => s.targetBombCount);
  const setTargetBombCount = useConfigStore((s) => s.setTargetBombCount);

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">目标爆款数</h3>
        <span className="text-xs text-neutral-500">范围 1–100，默认 20</span>
      </div>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={1}
          max={100}
          step={1}
          value={value}
          onChange={(e) => setTargetBombCount(Number(e.target.value))}
          className="flex-1 accent-brand-500"
        />
        <input
          type="number"
          min={1}
          max={100}
          value={value}
          onChange={(e) => setTargetBombCount(Number(e.target.value))}
          className="w-20 rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
    </section>
  );
}
