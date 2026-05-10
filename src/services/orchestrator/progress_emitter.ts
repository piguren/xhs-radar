import type { ScrapeStatus } from './scrape_state_machine';

export interface ProgressPatch {
  candidateCount?: number;
  bombCount?: number;
  detailFetchedCount?: number;
  currentKeyword?: string | null;
}

export class ProgressEmitter {
  private readonly batchId: string;

  constructor(batchId: string) {
    this.batchId = batchId;
  }

  emit(patch: ProgressPatch): void {
    chrome.runtime.sendMessage({ kind: 'SCRAPE_PROGRESS', batchId: this.batchId, patch });
  }

  emitStatus(status: ScrapeStatus): void {
    chrome.runtime.sendMessage({ kind: 'SCRAPE_STATUS', batchId: this.batchId, status });
  }
}
