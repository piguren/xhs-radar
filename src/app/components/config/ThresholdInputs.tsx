import { useConfigStore } from '@/app/store/configStore';

interface NumberInputProps {
  label: string;
  hint: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step: number;
}

function NumberInput({ label, hint, value, onChange, min, max, step }: NumberInputProps): React.ReactElement {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-semibold text-neutral-900">{label}</span>
        <span className="text-xs text-neutral-500">{hint}</span>
      </div>
      <input
        type="number"
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        min={min}
        max={max}
        step={step}
        className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
    </label>
  );
}

export function ThresholdInputs(): React.ReactElement {
  const cesThreshold = useConfigStore((s) => s.cesThreshold);
  const likeRatioThreshold = useConfigStore((s) => s.likeRatioThreshold);
  const setThreshold = useConfigStore((s) => s.setThreshold);

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-neutral-900">爆款判定阈值</h3>
      <div className="grid grid-cols-2 gap-3">
        <NumberInput
          label="综合评分 CES"
          hint="范围 10–100,000"
          value={cesThreshold}
          onChange={(v) => setThreshold('ces', v)}
          min={10}
          max={100_000}
          step={10}
        />
        <NumberInput
          label="点赞 / 粉丝比"
          hint="范围 0.01–10"
          value={likeRatioThreshold}
          onChange={(v) => setThreshold('likeRatio', v)}
          min={0.01}
          max={10}
          step={0.05}
        />
      </div>
    </section>
  );
}
