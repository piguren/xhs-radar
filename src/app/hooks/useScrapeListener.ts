import { useEffect, useState } from 'react';
import type { ScrapeStatus } from '@/services/orchestrator/scrape_state_machine';

export interface ScrapeProgress {
  candidateCount: number;
  bombCount: number;
  detailFetchedCount: number;
  currentKeyword: string | null;
}

const INITIAL: ScrapeProgress = {
  candidateCount: 0,
  bombCount: 0,
  detailFetchedCount: 0,
  currentKeyword: null,
};

export function useScrapeListener(batchId: string | null): {
  progress: ScrapeProgress;
  status: ScrapeStatus;
} {
  const [progress, setProgress] = useState<ScrapeProgress>(INITIAL);
  const [status, setStatus] = useState<ScrapeStatus>('idle');

  useEffect(() => {
    if (!batchId) return;
    const listener = (msg: { kind?: string; batchId?: string; patch?: Partial<ScrapeProgress>; status?: ScrapeStatus }) => {
      if (msg?.batchId !== batchId) return;
      if (msg.kind === 'SCRAPE_PROGRESS' && msg.patch) {
        setProgress((prev) => ({ ...prev, ...msg.patch }));
      } else if (msg.kind === 'SCRAPE_STATUS' && msg.status) {
        setStatus(msg.status);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, [batchId]);

  return { progress, status };
}
