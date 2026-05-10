import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import App from '@/app/App';
import { useScrapeStore, SCRAPE_INITIAL } from '@/app/store/scrapeStore';

describe('App — 进度桥与状态栏挂载', () => {
  let listenerRef: any;

  beforeEach(() => {
    listenerRef = undefined;
    (global as any).chrome = {
      runtime: {
        onMessage: {
          addListener: vi.fn((fn) => {
            listenerRef = fn;
          }),
          removeListener: vi.fn(),
        },
      },
    };
    useScrapeStore.setState({ ...SCRAPE_INITIAL });
  });

  it('mounts ScrapeProgressBridge — chrome.runtime.onMessage gets a listener', () => {
    render(<App />);
    expect((global as any).chrome.runtime.onMessage.addListener).toHaveBeenCalled();
  });

  it('renders BottomStatusBar fed from store after status changes', () => {
    useScrapeStore.getState().setBatchId('btch_app');
    render(<App />);

    act(() => {
      listenerRef({ kind: 'SCRAPE_STATUS', batchId: 'btch_app', status: 'scraping' });
      listenerRef({
        kind: 'SCRAPE_PROGRESS',
        batchId: 'btch_app',
        patch: { candidateCount: 12, currentKeyword: 'AI' },
      });
    });

    // BottomStatusBar 文案是 "抓取中"（无省略号）；按钮是 "抓取中…"（带省略号）
    expect(screen.getByText(/^抓取中$/)).toBeInTheDocument();
    expect(screen.getByText(/12/)).toBeInTheDocument();
  });
});
