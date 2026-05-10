import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useScrapeListener } from '@/app/hooks/useScrapeListener';

describe('useScrapeListener (T-075)', () => {
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
  });

  it('updates progress on SCRAPE_PROGRESS messages', () => {
    const { result } = renderHook(() => useScrapeListener('btch_1'));
    expect(result.current.progress.candidateCount).toBe(0);

    act(() => {
      listenerRef({ kind: 'SCRAPE_PROGRESS', batchId: 'btch_1', patch: { candidateCount: 50 } });
    });
    expect(result.current.progress.candidateCount).toBe(50);
  });

  it('updates status on SCRAPE_STATUS messages', () => {
    const { result } = renderHook(() => useScrapeListener('btch_1'));
    act(() => {
      listenerRef({ kind: 'SCRAPE_STATUS', batchId: 'btch_1', status: 'complete' });
    });
    expect(result.current.status).toBe('complete');
  });

  it('ignores messages with different batchId', () => {
    const { result } = renderHook(() => useScrapeListener('btch_1'));
    act(() => {
      listenerRef({ kind: 'SCRAPE_PROGRESS', batchId: 'OTHER', patch: { candidateCount: 99 } });
    });
    expect(result.current.progress.candidateCount).toBe(0);
  });
});
