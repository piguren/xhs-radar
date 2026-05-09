import { useConfigStore } from '@/app/store/configStore';

const OPTIONS: Array<{ value: 200 | 250 | 300; label: string; sub?: string }> = [
  { value: 200, label: '200', sub: '推荐' },
  { value: 250, label: '250' },
  { value: 300, label: '300', sub: '最大' },
];

export function PoolMaxSelector(): React.ReactElement {
  const value = useConfigStore((s) => s.candidatePoolMax);
  const setCandidatePoolMax = useConfigStore((s) => s.setCandidatePoolMax);

  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold text-neutral-900">候选池上限</h3>
      <p className="mb-2 text-xs text-neutral-500">越大越完整，但也越容易触发风控。建议从 200 起步。</p>
      <div className="flex gap-2">
        {OPTIONS.map((o) => {
          const active = value === o.value;
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => setCandidatePoolMax(o.value)}
              className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                active ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-neutral-300 bg-white text-neutral-700 hover:border-brand-300'
              }`}
            >
              <span className="font-semibold">{o.label}</span>
              {o.sub ? <span className="ml-1 text-xs text-neutral-500">{o.sub}</span> : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
