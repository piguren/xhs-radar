/**
 * configStore — 用户配置（持久化键: user_config）
 * 对应 docs/prd/xhs-radar-l3.md §2.1
 */
import { create } from 'zustand';
import type { TimeWindow } from '@/types/note';

export type DeepSeekModel = 'deepseek-chat' | 'deepseek-reasoner';
export type ApiKeyStatus = 'unconfigured' | 'untested' | 'testing' | 'valid' | 'invalid';

export interface ConfigState {
  keywords: string[];
  timeWindow: TimeWindow;
  cesThreshold: number;
  likeRatioThreshold: number;
  targetBombCount: number;
  candidatePoolMax: 200 | 250 | 300;
  deepseekApiKey: string;
  deepseekModel: DeepSeekModel;
  apiKeyStatus: ApiKeyStatus;
}

export interface ConfigActions {
  addKeyword: (kw: string) => void;
  removeKeyword: (kw: string) => void;
  setTimeWindow: (w: TimeWindow) => void;
  setThreshold: (kind: 'ces' | 'likeRatio', value: number) => void;
  setTargetBombCount: (n: number) => void;
  setCandidatePoolMax: (n: 200 | 250 | 300) => void;
  setApiKey: (key: string) => void;
  setModel: (m: DeepSeekModel) => void;
  setApiKeyStatus: (s: ApiKeyStatus) => void;
  reset: () => void;
}

export const CONFIG_INITIAL: ConfigState = {
  keywords: [],
  timeWindow: { type: 'preset', days: 7 },
  cesThreshold: 100,
  likeRatioThreshold: 0.5,
  targetBombCount: 20,
  candidatePoolMax: 200,
  deepseekApiKey: '',
  deepseekModel: 'deepseek-chat',
  apiKeyStatus: 'unconfigured',
};

const KW_LIMIT = 10;
const KW_MIN_LEN = 1;
const KW_MAX_LEN = 30;

export const useConfigStore = create<ConfigState & ConfigActions>((set, get) => ({
  ...CONFIG_INITIAL,

  addKeyword: (kw) => {
    const trimmed = kw.trim();
    if (trimmed.length < KW_MIN_LEN || trimmed.length > KW_MAX_LEN) return;
    const lower = trimmed.toLowerCase();
    const { keywords } = get();
    if (keywords.length >= KW_LIMIT) return;
    if (keywords.some((k) => k.toLowerCase() === lower)) return;
    set({ keywords: [...keywords, trimmed] });
  },

  removeKeyword: (kw) => {
    const lower = kw.toLowerCase();
    set({ keywords: get().keywords.filter((k) => k.toLowerCase() !== lower) });
  },

  setTimeWindow: (w) => set({ timeWindow: w }),

  setThreshold: (kind, value) => {
    if (kind === 'ces') {
      if (value < 10 || value > 100_000) return;
      set({ cesThreshold: value });
    } else {
      if (value < 0.01 || value > 10) return;
      set({ likeRatioThreshold: value });
    }
  },

  setTargetBombCount: (n) => {
    const clamped = Math.max(1, Math.min(100, Math.floor(n)));
    set({ targetBombCount: clamped });
  },

  setCandidatePoolMax: (n) => set({ candidatePoolMax: n }),

  setApiKey: (key) => set({ deepseekApiKey: key, apiKeyStatus: key ? 'untested' : 'unconfigured' }),

  setModel: (m) => set({ deepseekModel: m }),

  setApiKeyStatus: (s) => set({ apiKeyStatus: s }),

  reset: () => set({ ...CONFIG_INITIAL }),
}));
