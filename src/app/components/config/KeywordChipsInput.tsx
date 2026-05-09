import { useState, useRef } from 'react';
import { useConfigStore } from '@/app/store/configStore';

export function KeywordChipsInput(): React.ReactElement {
  const keywords = useConfigStore((s) => s.keywords);
  const addKeyword = useConfigStore((s) => s.addKeyword);
  const removeKeyword = useConfigStore((s) => s.removeKeyword);

  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const atLimit = keywords.length >= 10;

  const tryAdd = (): void => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    if (trimmed.length > 30) {
      setError('关键词长度需 1–30 字');
      return;
    }
    if (keywords.some((k) => k.toLowerCase() === trimmed.toLowerCase())) {
      setError('该关键词已存在');
      return;
    }
    if (atLimit) {
      setError('已达上限 10 个');
      return;
    }
    addKeyword(trimmed);
    setDraft('');
    setError(null);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',' || e.key === '，') {
      e.preventDefault();
      tryAdd();
    }
  };

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-neutral-900">关键词组</h3>
        <span className="text-xs text-neutral-500">{keywords.length}/10</span>
      </div>
      <div className="flex flex-wrap gap-2 rounded-lg border border-neutral-300 bg-white p-2 focus-within:border-brand-500">
        {keywords.map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1 text-xs text-brand-700"
          >
            {kw}
            <button
              type="button"
              onClick={() => removeKeyword(kw)}
              className="text-brand-500 hover:text-brand-700"
              aria-label={`移除 ${kw}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            setError(null);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (draft.trim()) tryAdd();
          }}
          disabled={atLimit}
          placeholder={atLimit ? '已达上限 10 个' : '输入后按 Enter 或逗号添加'}
          className="min-w-[180px] flex-1 bg-transparent text-sm text-neutral-900 outline-none disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {error ? <p className="mt-1 text-xs text-error-500">{error}</p> : null}
    </section>
  );
}
