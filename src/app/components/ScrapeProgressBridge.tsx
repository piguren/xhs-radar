import { useEffect } from 'react';
import { useScrapeStore } from '@/app/store/scrapeStore';
import type { ScrapeStatus } from '@/services/orchestrator/scrape_state_machine';
import type { ScrapeProgress } from '@/app/store/scrapeStore';

interface BridgeMsg {
  kind?: string;
  batchId?: string;
  patch?: Partial<ScrapeProgress>;
  status?: ScrapeStatus;
}

export function ScrapeProgressBridge(): null {
  useEffect(() => {
    const listener = (msg: BridgeMsg) => {
      const currentBatchId = useScrapeStore.getState().currentBatchId;
      if (!currentBatchId || msg?.batchId !== currentBatchId) return;
      if (msg.kind === 'SCRAPE_PROGRESS' && msg.patch) {
        useScrapeStore.getState().updateProgress(msg.patch);
      } else if (msg.kind === 'SCRAPE_STATUS' && msg.status) {
        useScrapeStore.getState().setStatus(msg.status);
      }
    };
    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  return null;
}
