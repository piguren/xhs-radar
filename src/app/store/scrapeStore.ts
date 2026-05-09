/**
 * scrapeStore — 当前抓取流程瞬态（不持久化）
 * 由 service worker 通过 messaging 推进度，dashboard 端只读。
 */
import { create } from 'zustand';

export type ScrapeStatus =
  | 'idle' | 'validating' | 'scraping' | 'captcha_paused'
  | 'detail_fetching' | 'complete' | 'stopped' | 'failed';

export interface ScrapeProgress {
  candidateCount: number;
  bombCount: number;
  detailFetchedCount: number;
  currentKeyword: string | null;
  startedAt: number;
  lastUpdateAt: number;
}

export interface ScrapeState {
  status: ScrapeStatus;
  progress: ScrapeProgress;
  currentBatchId: string | null;
  error: { code: string; message: string } | null;
}

export interface ScrapeActions {
  setStatus: (s: ScrapeStatus) => void;
  updateProgress: (patch: Partial<ScrapeProgress>) => void;
  setBatchId: (id: string | null) => void;
  setError: (e: { code: string; message: string } | null) => void;
  reset: () => void;
}

export const SCRAPE_INITIAL: ScrapeState = {
  status: 'idle',
  progress: {
    candidateCount: 0,
    bombCount: 0,
    detailFetchedCount: 0,
    currentKeyword: null,
    startedAt: 0,
    lastUpdateAt: 0,
  },
  currentBatchId: null,
  error: null,
};

export const useScrapeStore = create<ScrapeState & ScrapeActions>((set, get) => ({
  ...SCRAPE_INITIAL,

  setStatus: (status) => set({ status }),

  updateProgress: (patch) =>
    set({ progress: { ...get().progress, ...patch, lastUpdateAt: Date.now() } }),

  setBatchId: (id) => set({ currentBatchId: id }),

  setError: (error) => set({ error }),

  reset: () => set({ ...SCRAPE_INITIAL }),
}));
