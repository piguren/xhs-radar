import { useState } from 'react';
import { useConfigStore } from '@/app/store/configStore';
import { useToast } from '@/app/hooks/useToast';
import { testKey } from '@/services/deepseek/client';

const STATUS_TEXT = {
  unconfigured: '未配置',
  untested: '未测试',
  testing: '测试中',
  valid: '✅ 有效',
  invalid: '❌ 无效',
} as const;

const STATUS_CLASS = {
  unconfigured: 'text-neutral-500',
  untested: 'text-warning-500',
  testing: 'text-neutral-700',
  valid: 'text-success-500',
  invalid: 'text-error-500',
} as const;

export function ApiKeyInput(): React.ReactElement {
  const apiKey = useConfigStore((s) => s.deepseekApiKey);
  const model = useConfigStore((s) => s.deepseekModel);
  const status = useConfigStore((s) => s.apiKeyStatus);
  const setApiKey = useConfigStore((s) => s.setApiKey);
  const setModel = useConfigStore((s) => s.setModel);
  const setApiKeyStatus = useConfigStore((s) => s.setApiKeyStatus);
  const toast = useToast();

  const [reveal, setReveal] = useState(false);

  const onTest = async (): Promise<void> => {
    if (!apiKey.trim()) {
      toast({ type: 'warning', message: '请先填入 API Key' });
      return;
    }
    setApiKeyStatus('testing');
    const r = await testKey(apiKey);
    if (r.ok) {
      setApiKeyStatus('valid');
      toast({ type: 'success', message: 'Key 有效' });
    } else {
      setApiKeyStatus('invalid');
      const reason =
        r.reason === 'unauthorized' ? 'Key 无效' :
        r.reason === 'rate_limited' ? '触发限流，请稍后重试' :
        r.reason === 'network' ? '网络错误' :
        '未知错误';
      toast({ type: 'error', message: `${reason}：${r.message}` });
    }
  };

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 id="apikey-section" className="text-sm font-semibold text-neutral-900">DeepSeek API Key</h3>
        <span className={`text-xs ${STATUS_CLASS[status]}`}>{STATUS_TEXT[status]}</span>
      </div>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={reveal ? 'text' : 'password'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="sk-..."
            className="w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 pr-10 text-sm focus:border-brand-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setReveal((x) => !x)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-700"
            aria-label={reveal ? '隐藏 Key' : '显示 Key'}
          >
            {reveal ? '🙈' : '👁'}
          </button>
        </div>
        <button
          type="button"
          onClick={onTest}
          disabled={status === 'testing'}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 hover:border-brand-300 hover:bg-neutral-50 disabled:opacity-50"
        >
          {status === 'testing' ? '测试中…' : '测试 Key'}
        </button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <label className="text-xs text-neutral-500">模型</label>
        <select
          value={model}
          onChange={(e) => setModel(e.target.value as typeof model)}
          className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs"
        >
          <option value="deepseek-chat">deepseek-chat（默认）</option>
          <option value="deepseek-reasoner">deepseek-reasoner</option>
        </select>
      </div>
      <p className="mt-2 text-xs text-neutral-500">
        Key 仅存本地浏览器，不联网外发。
        <a
          href="https://platform.deepseek.com/api_keys"
          target="_blank"
          rel="noopener noreferrer"
          className="ml-1 text-brand-500 hover:underline"
        >
          如何获取 →
        </a>
      </p>
    </section>
  );
}
