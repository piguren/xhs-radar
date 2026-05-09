/**
 * uiStore — 路由 / 弹窗 / Toast / 抽屉 瞬态
 */
import { create } from 'zustand';
import type { AiTaskKind } from './aiStore';

export type Tab = 'config' | 'display' | 'favorites' | 'history';

export type ModalKind =
  | null
  | 'confirm_start_scrape'
  | 'not_logged_in'
  | 'captcha_paused'
  | 'missing_api_key'
  | 'confirm_delete'
  | 'diagnostics';

export interface ModalPayload {
  kind: ModalKind;
  data?: Record<string, unknown>;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  durationMs: number;
}

export interface UiState {
  currentTab: Tab;
  drawerOpenNoteId: string | null;
  drawerActiveAiTab: AiTaskKind | null;
  modal: ModalPayload;
  toasts: ToastItem[];
}

export interface UiActions {
  setTab: (t: Tab) => void;
  openDrawer: (noteId: string) => void;
  closeDrawer: () => void;
  setDrawerAiTab: (k: AiTaskKind | null) => void;
  showModal: (m: ModalPayload) => void;
  hideModal: () => void;
  addToast: (toast: Omit<ToastItem, 'id'>) => string;
  removeToast: (id: string) => void;
}

export const UI_INITIAL: UiState = {
  currentTab: 'config',
  drawerOpenNoteId: null,
  drawerActiveAiTab: null,
  modal: { kind: null },
  toasts: [],
};

let toastCounter = 0;
const genToastId = (): string => `toast_${Date.now()}_${++toastCounter}`;

export const useUiStore = create<UiState & UiActions>((set, get) => ({
  ...UI_INITIAL,

  setTab: (currentTab) => set({ currentTab }),
  openDrawer: (noteId) => set({ drawerOpenNoteId: noteId }),
  closeDrawer: () => set({ drawerOpenNoteId: null, drawerActiveAiTab: null }),
  setDrawerAiTab: (drawerActiveAiTab) => set({ drawerActiveAiTab }),
  showModal: (modal) => set({ modal }),
  hideModal: () => set({ modal: { kind: null } }),

  addToast: (t) => {
    const id = genToastId();
    set({ toasts: [...get().toasts, { ...t, id }] });
    return id;
  },

  removeToast: (id) => set({ toasts: get().toasts.filter((x) => x.id !== id) }),
}));
