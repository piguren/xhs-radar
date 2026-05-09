/**
 * favoritesStore — 收藏库（持久化键: favorites）
 * 冗余存储 NoteRecord 快照，避免源批次被删除后丢失。
 */
import { create } from 'zustand';
import type { NoteRecord } from '@/types/note';

export interface FavoriteSnapshot {
  title: NoteRecord['title'];
  user: NoteRecord['user'];
  interactInfo: NoteRecord['interactInfo'];
  cesScore: NoteRecord['cesScore'];
  time: NoteRecord['time'];
  desc: NoteRecord['desc'];
}

export interface FavoriteRecord {
  noteId: string;
  snapshot: FavoriteSnapshot;
  favoritedAt: number;
  sourceBatchId: string;
}

export interface FavoritesState {
  byNoteId: Record<string, FavoriteRecord>;
}

export interface FavoritesActions {
  add: (note: NoteRecord, sourceBatchId: string) => void;
  remove: (noteId: string) => void;
  isFavorited: (noteId: string) => boolean;
  list: () => FavoriteRecord[];
}

export const FAVORITES_INITIAL: FavoritesState = { byNoteId: {} };

export const useFavoritesStore = create<FavoritesState & FavoritesActions>((set, get) => ({
  ...FAVORITES_INITIAL,

  add: (note, sourceBatchId) => {
    const record: FavoriteRecord = {
      noteId: note.noteId,
      snapshot: {
        title: note.title,
        user: note.user,
        interactInfo: note.interactInfo,
        cesScore: note.cesScore,
        time: note.time,
        desc: note.desc,
      },
      favoritedAt: Date.now(),
      sourceBatchId,
    };
    set({ byNoteId: { ...get().byNoteId, [note.noteId]: record } });
  },

  remove: (noteId) => {
    const { [noteId]: _omit, ...rest } = get().byNoteId;
    set({ byNoteId: rest });
  },

  isFavorited: (noteId) => Boolean(get().byNoteId[noteId]),

  list: () =>
    Object.values(get().byNoteId).sort((a, b) => b.favoritedAt - a.favoritedAt),
}));
