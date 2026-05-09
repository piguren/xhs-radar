import { useState } from 'react';
import { useConfigStore } from '@/app/store/configStore';

const DAY = 86_400_000;

const PRESETS: Array<{ label: string; days: 3 | 7 | 30 }> = [
  { label: '近 3 天', days: 3 },
  { label: '近 7 天', days: 7 },
  { label: '近 30 天', days: 30 },
];

function fmtDate(ts: number): string {
  const d = new Date(ts);
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

function parseDate(s: string): number {
  return new Date(s + 'T00:00:00').getTime();
}

export function TimeWindowSelector(): React.ReactElement {
  const tw = useConfigStore((s) => s.timeWindow);
  const setTimeWindow = useConfigStore((s) => s.setTimeWindow);

  const isCustom = tw.type === 'custom';
  const todayMs = Date.now();
  const defaultStart = todayMs - 7 * DAY;
  const defaultEnd = todayMs;

  const [error, setError] = useState<string | null>(null);
  const [customStart, setCustomStart] = useState(fmtDate(isCustom ? tw.start : defaultStart));
  const [customEnd, setCustomEnd] = useState(fmtDate(isCustom ? tw.end : defaultEnd));

  const onPickPreset = (days: 3 | 7 | 30): void => {
    setTimeWindow({ type: 'preset', days });
    setError(null);
  };

  const onPickCustom = (): void => {
    setTimeWindow({ type: 'custom', start: parseDate(customStart), end: parseDate(customEnd) });
  };

  const onChangeRange = (start: string, end: string): void => {
    const s = parseDate(start);
    const e = parseDate(end);
    if (e < s) {
      setError('结束日期需晚于开始日期');
      return;
    }
    if ((e - s) / DAY > 365) {
      setError('日期范围需 ≤ 365 天');
      return;
    }
    setError(null);
    setTimeWindow({ type: 'custom', start: s, end: e });
  };

  return (
    <section>
      <h3 className="mb-2 text-sm font-semibold text-neutral-900">时间窗口</h3>
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => {
          const active = tw.type === 'preset' && tw.days === p.days;
          return (
            <button
              key={p.days}
              type="button"
              onClick={() => onPickPreset(p.days)}
              className={`rounded-full border px-3 py-1 text-xs ${
                active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-300'
              }`}
            >
              {p.label}
            </button>
          );
        })}
        <button
          type="button"
          onClick={onPickCustom}
          className={`rounded-full border px-3 py-1 text-xs ${
            isCustom ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-300'
          }`}
        >
          自定义
        </button>
      </div>
      {isCustom ? (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => {
              setCustomStart(e.target.value);
              onChangeRange(e.target.value, customEnd);
            }}
            className="rounded border border-neutral-300 px-2 py-1 text-sm"
          />
          <span className="text-neutral-500">至</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => {
              setCustomEnd(e.target.value);
              onChangeRange(customStart, e.target.value);
            }}
            className="rounded border border-neutral-300 px-2 py-1 text-sm"
          />
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs text-error-500">{error}</p> : null}
    </section>
  );
}
