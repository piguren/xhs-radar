import { useConfigStore } from '@/app/store/configStore';
import { useScrapeStore } from '@/app/store/scrapeStore';
import { useToast } from '@/app/hooks/useToast';

interface Props {
  onStart: () => void;
}

const IN_FLIGHT_STATUSES = new Set(['validating', 'scraping', 'captcha_paused', 'detail_fetching']);

export function StartScrapeButton({ onStart }: Props): React.ReactElement {
  const keywords = useConfigStore((s) => s.keywords);
  const targetBombCount = useConfigStore((s) => s.targetBombCount);
  const tw = useConfigStore((s) => s.timeWindow);
  const status = useScrapeStore((s) => s.status);
  const toast = useToast();

  const inFlight = IN_FLIGHT_STATUSES.has(status);
  const disabled = keywords.length === 0 || inFlight;

  const summary =
    `${keywords.slice(0, 3).join(', ')}${keywords.length > 3 ? `...+${keywords.length - 3}` : ''} · ` +
    (tw.type === 'preset' ? `近 ${tw.days} 天` : '自定义日期') +
    ` · 目标 ${targetBombCount} 条`;

  const onClick = (): void => {
    if (disabled) {
      toast({ type: 'warning', message: '请至少添加 1 个关键词' });
      return;
    }
    onStart();
  };

  return (
    <div className="sticky bottom-0 -mx-6 mt-6 border-t border-neutral-200 bg-white/95 px-6 py-4 backdrop-blur">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className="w-full rounded-lg bg-brand-500 px-4 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-brand-600 active:bg-brand-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
      >
        {inFlight ? '抓取中…' : '开始抓取'}
      </button>
      <p className="mt-2 text-center text-xs text-neutral-500">{summary}</p>
    </div>
  );
}
