import { useEffect, useState } from 'react';

interface DiagEntry {
  ts: number;
  endpoint: 'search' | 'feed' | 'user_info';
  payload: unknown;
}

const DIAG_KEY = '__xhs_radar_diag';

export function Popup(): React.ReactElement {
  const [diagStatus, setDiagStatus] = useState<'idle' | 'starting' | 'capturing' | 'no_xhs'>('idle');
  const [captures, setCaptures] = useState<DiagEntry[]>([]);

  useEffect(() => {
    if (diagStatus !== 'capturing') return;
    const t = setInterval(() => {
      chrome.storage.local.get([DIAG_KEY], (items) => {
        setCaptures((items[DIAG_KEY] as DiagEntry[] | undefined) ?? []);
      });
    }, 1000);
    return () => clearInterval(t);
  }, [diagStatus]);

  const openDashboard = (): void => {
    // 必须打开 dist/public/dashboard.html：Vite 会把 public/ 里未改写的 HTML 同步拷到 dist/ 根目录，
    // 根上的 dashboard.html 仍指向 /src/.../*.tsx，在扩展里会 404。
    chrome.tabs.create({ url: chrome.runtime.getURL('public/dashboard.html') });
    window.close();
  };

  const beginDiag = (): void => {
    setDiagStatus('starting');
    setCaptures([]);
    chrome.storage.local.remove([DIAG_KEY], () => {
      chrome.runtime.sendMessage({ kind: 'DIAG_BEGIN' }, (resp) => {
        if (resp?.ok) {
          setDiagStatus('capturing');
        } else if (resp?.reason === 'not_on_xhs') {
          setDiagStatus('no_xhs');
        } else {
          setDiagStatus('idle');
        }
      });
    });
  };

  const copyJson = async (entry: DiagEntry): Promise<void> => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(entry.payload, null, 2));
      const el = document.createElement('div');
      el.textContent = '已复制 JSON';
      el.className = 'fixed left-1/2 top-2 -translate-x-1/2 rounded bg-success-500 px-2 py-1 text-xs text-white';
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1500);
    } catch {
      /* ignore */
    }
  };

  const latest = captures[0];

  return (
    <div className="p-3" style={{ width: 320 }}>
      <h1 className="text-base font-semibold text-brand-500">📡 xhs-radar</h1>
      <p className="mt-0.5 text-[11px] text-neutral-500">赛道爆款雷达</p>

      <button
        type="button"
        onClick={openDashboard}
        className="mt-3 w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600"
      >
        打开 Dashboard
      </button>

      <hr className="my-3 border-neutral-200" />

      <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-2">
        <div className="mb-1 flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-700">🔬 T-069 诊断捕获</span>
          {diagStatus === 'capturing' ? (
            <span className="text-[10px] text-success-500">捕获中</span>
          ) : null}
        </div>
        <p className="mb-2 text-[11px] leading-snug text-neutral-500">
          先在小红书搜索页（如 xiaohongshu.com/search）登录并打开搜索结果，再点下方按钮，然后回到该 Tab 慢速滚动 1–2 屏。
        </p>

        <button
          type="button"
          onClick={beginDiag}
          disabled={diagStatus === 'starting' || diagStatus === 'capturing'}
          className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-xs font-medium text-neutral-700 hover:border-brand-300 hover:bg-brand-50 disabled:opacity-50"
        >
          {diagStatus === 'capturing' ? '已激活 — 请回到小红书 Tab 滚动' : '开始诊断捕获'}
        </button>

        {diagStatus === 'no_xhs' ? (
          <p className="mt-2 text-[11px] text-error-500">
            当前 Tab 不是小红书。请打开 xiaohongshu.com 后重试。
          </p>
        ) : null}

        {captures.length > 0 ? (
          <div className="mt-2">
            <div className="mb-1 text-[10px] text-neutral-500">已捕获 {captures.length} 条（最多保留最近 5 条）</div>
            {latest ? (
              <div className="rounded border border-neutral-200 bg-white p-1.5">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-brand-500">{latest.endpoint}</span>
                  <button
                    type="button"
                    onClick={() => void copyJson(latest)}
                    className="text-[10px] text-brand-500 hover:underline"
                  >
                    复制 JSON
                  </button>
                </div>
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all rounded bg-neutral-50 p-1 text-[9px] leading-tight text-neutral-700">
                  {JSON.stringify(latest.payload, null, 2).slice(0, 1200)}
                  {JSON.stringify(latest.payload, null, 2).length > 1200 ? '\n... (truncated, 复制按钮拿完整版)' : ''}
                </pre>
              </div>
            ) : null}
          </div>
        ) : diagStatus === 'capturing' ? (
          <p className="mt-2 text-[11px] text-neutral-500">等待响应... 滚动小红书页面。</p>
        ) : null}
      </div>
    </div>
  );
}
