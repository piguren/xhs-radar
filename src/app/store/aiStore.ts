/**
 * aiStore — 4 个 AI 任务的调用状态（瞬态）
 * 结果本身写入 batchStore.aiResults，本 store 仅追踪"调用进展"。
 */
import { create } from 'zustand';

export type GlobalAiKind = 'topic_suggestions' | 'angle_clusters' | 'trend_keywords';
export type AiTaskKind = GlobalAiKind | 'structure_breakdown';
export type AiTaskStatus = 'idle' | 'loading' | 'retrying' | 'success' | 'failed';

export interface AiTaskState {
  status: AiTaskStatus;
  startedAt: number | null;
  error: { code: string; message: string } | null;
}

const TASK_INITIAL: AiTaskState = { status: 'idle', startedAt: null, error: null };

export interface AiState {
  global: Record<string /* batchId */, Record<GlobalAiKind, AiTaskState>>;
  perNote: Record<string /* noteId */, { structure_breakdown: AiTaskState }>;
}

export interface AiActions {
  setGlobalStatus: (
    batchId: string,
    kind: GlobalAiKind,
    state: Partial<AiTaskState>,
  ) => void;
  setPerNoteStatus: (noteId: string, state: Partial<AiTaskState>) => void;
  reset: () => void;
}

export const AI_INITIAL: AiState = { global: {}, perNote: {} };

const emptyGlobalSlot = (): Record<GlobalAiKind, AiTaskState> => ({
  topic_suggestions: { ...TASK_INITIAL },
  angle_clusters: { ...TASK_INITIAL },
  trend_keywords: { ...TASK_INITIAL },
});

export const useAiStore = create<AiState & AiActions>((set, get) => ({
  ...AI_INITIAL,

  setGlobalStatus: (batchId, kind, patch) => {
    const slot = get().global[batchId] ?? emptyGlobalSlot();
    set({
      global: {
        ...get().global,
        [batchId]: { ...slot, [kind]: { ...slot[kind], ...patch } },
      },
    });
  },

  setPerNoteStatus: (noteId, patch) => {
    const slot = get().perNote[noteId] ?? { structure_breakdown: { ...TASK_INITIAL } };
    set({
      perNote: {
        ...get().perNote,
        [noteId]: { structure_breakdown: { ...slot.structure_breakdown, ...patch } },
      },
    });
  },

  reset: () => set({ ...AI_INITIAL }),
}));
