import { KeywordChipsInput } from '@/app/components/config/KeywordChipsInput';
import { TimeWindowSelector } from '@/app/components/config/TimeWindowSelector';
import { ThresholdInputs } from '@/app/components/config/ThresholdInputs';
import { TargetCountInput } from '@/app/components/config/TargetCountInput';
import { PoolMaxSelector } from '@/app/components/config/PoolMaxSelector';
import { ApiKeyInput } from '@/app/components/config/ApiKeyInput';
import { StartScrapeButton } from '@/app/components/config/StartScrapeButton';
import { useToast } from '@/app/hooks/useToast';

/**
 * 配置 Tab — 对应 docs/prd/xhs-radar-l3.md §2.1 + AC-001~009
 */
export function ConfigPage(): React.ReactElement {
  const toast = useToast();

  // Phase 1.7 实现真正的抓取启动；先放 Toast 占位
  const onStart = (): void => {
    toast({ type: 'info', message: '抓取主流程将在 Phase 1.7 完成（T-074）', durationMs: 4000 });
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
