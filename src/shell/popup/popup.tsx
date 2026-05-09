import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/index.css';

function Popup(): React.ReactElement {
  const openDashboard = (): void => {
    chrome.tabs.create({
      url: chrome.runtime.getURL('public/dashboard.html'),
    });
    window.close();
  };

  return (
    <div className="p-4">
      <h1 className="text-base font-semibold text-brand-500">📡 xhs-radar</h1>
      <p className="mt-1 text-xs text-neutral-500">赛道爆款雷达</p>
      <button
        type="button"
        onClick={openDashboard}
        className="mt-3 w-full rounded-lg bg-brand-500 px-3 py-2 text-sm font-medium text-white hover:bg-brand-600 active:bg-brand-700"
      >
        打开 Dashboard
      </button>
    </div>
  );
}

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('Popup root element not found');

createRoot(rootEl).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
);
