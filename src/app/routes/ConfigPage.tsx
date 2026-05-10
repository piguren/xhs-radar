import { KeywordChipsInput } from '@/app/components/config/KeywordChipsInput';
import { TimeWindowSelector } from '@/app/components/config/TimeWindowSelector';
import { ThresholdInputs } from '@/app/components/config/ThresholdInputs';
import { TargetCountInput } from '@/app/components/config/TargetCountInput';
import { PoolMaxSelector } from '@/app/components/config/PoolMaxSelector';
import { ApiKeyInput } from '@/app/components/config/ApiKeyInput';
import { StartScrapeButton } from '@/app/components/config/StartScrapeButton';
import { useToast } from '@/app/hooks/useToast';
import { useConfigStore } from '@/app/store/configStore';
import { useScrapeStore } from '@/app/store/scrapeStore';
import type { StartScrapePayload } from '@/services/orchestrator/handle_start_scrape';

/**
 * 配置 Tab — 对应 docs/prd/xhs-radar-l3.md §2.1 + AC-001~009
 */
export function ConfigPage(): React.ReactElement {
  const toast = useToast();

  const onStart = (): void => {
    const cfg = useConfigStore.getState();
    const batchId =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    const payload: StartScrapePayload = {
      batchId,
      keywords: cfg.keywords,
      timeWindow: cfg.timeWindow,
      thresholds: { ces: cfg.cesThreshold, likeRatio: cfg.likeRatioThreshold },
      candidatePoolMax: cfg.candidatePoolMax,
      targetBombCount: cfg.targetBombCount,
    };

    useScrapeStore.getState().reset();
    useScrapeStore.getState().setBatchId(batchId);
    useScrapeStore.getState().setStatus('validating');

    chrome.runtime.sendMessage({ kind: 'START_SCRAPE', payload }, (resp) => {
      const lastErr = chrome.runtime.lastError;
      if (lastErr) {
        const lastErrMsg: string = lastErr.message ?? 'unknown';
        useScrapeStore.getState().setStatus('failed');
        useScrapeStore.getState().setError({ code: 'sw_unreachable', message: lastErrMsg });
        toast({ type: 'error', message: `启动失败：${lastErrMsg}`, durationMs: 4000 });
        return;
      }
      if (resp && resp.success === false) {
        const errMsg: string = resp.error ?? 'unknown';
        useScrapeStore.getState().setStatus('failed');
        useScrapeStore.getState().setError({ code: 'orchestrator_error', message: errMsg });
        toast({ type: 'error', message: `抓取失败：${errMsg}`, durationMs: 4000 });
      }
    });

    toast({ type: 'info', message: `已启动抓取 · batch ${batchId.slice(0, 8)}`, durationMs: 3000 });
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="mb-1 text-2xl font-bold text-neutral-900">📡 配置抓取</h1>
      <p className="mb-6 text-sm text-neutral-500">
        输入关键词组、设置时间窗口与爆款阈值，点击「开始抓取」启动。
      </p>
      <div className="space-y-6">
        <KeywordChipsInput />
        <TimeWindowSelector />
        <ThresholdInputs />
        <TargetCountInput />
        <PoolMaxSelector />
        <ApiKeyInput />
      </div>
      <StartScrapeButton onStart={onStart} />
    </div>
  );
}
