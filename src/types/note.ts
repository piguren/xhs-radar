/**
 * 笔记 / 批次共享类型。
 * 抽离自 L3 §1.4 的 batchStore 命名空间，保证 services/ 不依赖 app/。
 * 完整字段定义见 docs/prd/xhs-radar-l3.md §3.1 + §3.2。
 */

import type { TimeWindow } from '@/services/scoring/in_time_window';

// === Tag ===
export interface NoteTag {
  type: 'topic' | 'brand' | 'topic_page' | string;
  name: string;
  id?: string;
}

// === User ===
export interface NoteUser {
  userId: string;
  nickname: string;
  avatar: string;
  fans: number | null;
}

// === Interaction ===
export interface InteractInfo {
  likedCount: number;
  collectedCount: number;
  commentCount: number;
  shareCount: number;
}

// === Bomb judgement ===
export type BombReason = 'super' | 'fallback' | 'not_bomb';

// === Note record ===
export interface NoteRecord {
  // 来自搜索接口
  noteId: string;
  xsecToken: string;
  modelType: 'note' | 'video' | 'ad';
  title: string;
  time: number;
  lastUpdateTime: number;
  tagList: NoteTag[];
  user: NoteUser;
  interactInfo: InteractInfo;

  // 来自详情接口（懒加载）
  desc: string | null;
  detailFetchedAt: number | null;

  // 本地计算字段
  cesScore: number;
  likeToFansRatio: number | null;
  daysSincePublish: number;
  timeDecayFactor: number;
  weightedScore: number;
  isBomb: boolean;
  bombReason: BombReason;

  // AI 生成
  clusterLabel: string | null;

  // 失败标记
  detailFetchFailed: boolean;
  fanFetchFailed: boolean;
  isDeleted: boolean;
}

// === Thresholds ===
export interface BombThresholds {
  ces: number;
  likeRatio: number;
}

// === Batch record (lightweight) ===
export interface BatchRecord {
  batchId: string;
  createdAt: number;
  keywords: string[];
  timeWindow: TimeWindow;
  thresholds: BombThresholds;
  candidatePoolMax: number;
  notes: NoteRecord[];
  candidateCount: number;
  bombCount: number;
  fallbackCount: number;
  status: 'running' | 'complete' | 'stopped' | 'failed';
  // aiResults 在 Phase 1.9 实现，先 unknown 兜底
  aiResults: {
    topicSuggestions: unknown | null;
    angleClusters: unknown | null;
    trendKeywords: unknown | null;
    structureBreakdown: Record<string, unknown>;
  };
}

export type { TimeWindow };
