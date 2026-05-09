/**
 * historyStore — 历史批次列表（持久化键: history）
 * 仅存元数据；批次详情存于 chrome.storage.local 的 batch_<id> 键。
 * 自动维护"最多 10 条"（push 时移除最旧）。
 */
import { create } from 'zustand';
import type { BatchRecord } from '@/types/note';

export interface HistoryEntry {
  batchId: string;
  createdAt: number;
  keywords: string[];
  candidateCount: number;
  bombCount: number;
  status: BatchRecord['status'];
}

export interface HistoryState {
  entries: HistoryEntry[];
}

export interface HistoryActions {
  push: (b: BatchRecord) => void;
  removeById: (batchId: string) => void;
  loadBatchDetail: (batchId: string) => Promise<BatchRecord | null>;
}

export const HISTORY_INITIAL: HistoryState = { entries: [] };

const HISTORY_LIMIT = 10;

export const useHistoryStore = create<HistoryState & HistoryActions>((set, get) => ({
  ...HISTORY_INITIAL,

  push: (b) => {
    const entry: HistoryEntry = {
      batchId: b.batchId,
      createdAt: b.createdAt,
      keywords: b.keywords,
      candidateCount: b.candidateCount,
      bombCount: b.bombCount,
      status: b.status,
    };
    const merged = [entry, ...get().entries.filter((e) => e.batchId !== b.batchId)]
      .sort((a, x) => x.createdAt - a.createdAt)
      .slice(0, HISTORY_LIMIT);
    set({ entries: merged });
  },

  removeById: (batchId) => {
    set({ entries: get().entries.filter((e) => e.batchId !== batchId) });
  },

  loadBatchDetail: async (_batchId) => {
    // Phase 1.10 接 storageGet(`batch_${batchId}`)
    return null;
  },
}));
