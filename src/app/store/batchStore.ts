/**
 * batchStore — 当前展示批次（间接持久化：current 不直接持久；切批次时从 storage 读）
 */
import { create } from 'zustand';
import type { BatchRecord, NoteRecord } from '@/types/note';

export interface BatchState {
  current: BatchRecord | null;
}

export interface BatchActions {
  setCurrent: (b: BatchRecord | null) => void;
  updateNoteDetail: (noteId: string, patch: Partial<NoteRecord>) => void;
  setAiResult: <K extends keyof BatchRecord['aiResults']>(
    key: K,
    value: BatchRecord['aiResults'][K],
  ) => void;
}

export const BATCH_INITIAL: BatchState = { current: null };

export const useBatchStore = create<BatchState & BatchActions>((set, get) => ({
  ...BATCH_INITIAL,

  setCurrent: (b) => set({ current: b }),

  updateNoteDetail: (noteId, patch) => {
    const cur = get().current;
    if (!cur) return;
    set({
      current: {
        ...cur,
        notes: cur.notes.map((n) => (n.noteId === noteId ? { ...n, ...patch } : n)),
      },
    });
  },

  setAiResult: (key, value) => {
    const cur = get().current;
    if (!cur) return;
    set({ current: { ...cur, aiResults: { ...cur.aiResults, [key]: value } } });
  },
}));
