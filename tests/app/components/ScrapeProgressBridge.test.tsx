import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { ScrapeProgressBridge } from '@/app/components/ScrapeProgressBridge';
import { useScrapeStore, SCRAPE_INITIAL } from '@/app/store/scrapeStore';

describe('ScrapeProgressBridge (P0 进度桥)', () => {
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

  it('writes SCRAPE_STATUS into useScrapeStore when batchId matches', () => {
    useScrapeStore.getState().setBatchId('btch_a');
    render(<ScrapeProgressBridge />);

    act(() => {
      listenerRef({ kind: 'SCRAPE_STATUS', batchId: 'btch_a', status: 'scraping' });
    });

    expect(useScrapeStore.getState().status).toBe('scraping');
  });

  it('writes SCRAPE_PROGRESS patch into useScrapeStore.progress', () => {
    useScrapeStore.getState().setBatchId('btch_a');
    render(<ScrapeProgressBridge />);

    act(() => {
      listenerRef({
        kind: 'SCRAPE_PROGRESS',
        batchId: 'btch_a',
        patch: { candidateCount: 42, currentKeyword: 'kw1' },
      });
    });

    const p = useScrapeStore.getState().progress;
    expect(p.candidateCount).toBe(42);
    expect(p.currentKeyword).toBe('kw1');
  });

  it('ignores messages with mismatching batchId', () => {
    useScrapeStore.getState().setBatchId('btch_a');
    render(<ScrapeProgressBridge />);

    act(() => {
      listenerRef({ kind: 'SCRAPE_STATUS', batchId: 'OTHER', status: 'complete' });
    });

    expect(useScrapeStore.getState().status).toBe('idle');
  });

  it('removes listener on unmount', () => {
    useScrapeStore.getState().setBatchId('btch_a');
    const { unmount } = render(<ScrapeProgressBridge />);
    unmount();
    expect((global as any).chrome.runtime.onMessage.removeListener).toHaveBeenCalled();
  });
});
