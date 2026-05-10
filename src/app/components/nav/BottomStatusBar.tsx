import type { ScrapeStatus } from '@/services/orchestrator/scrape_state_machine';
import type { ScrapeProgress } from '@/app/hooks/useScrapeListener';

interface Props {
  status: ScrapeStatus;
  progress: ScrapeProgress;
}

const STATUS_LABEL: Record<ScrapeStatus, { text: string; cls: string }> = {
  idle: { text: '', cls: '' },
  validating: { text: '校验登录中', cls: 'bg-neutral-100 text-neutral-700' },
  scraping: { text: '抓取中', cls: 'bg-brand-50 text-brand-700' },
  captcha_paused: { text: '已暂停 — 请通过验证', cls: 'bg-warning-100 text-warning-500' },
  detail_fetching: { text: '抓取正文中', cls: 'bg-brand-50 text-brand-700' },
  complete: { text: '已完成', cls: 'bg-success-100 text-success-500' },
  stopped: { text: '已停止', cls: 'bg-neutral-100 text-neutral-700' },
  failed: { text: '失败', cls: 'bg-error-100 text-error-500' },
};

export function BottomStatusBar({ status, progress }: Props) {
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
