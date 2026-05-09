/**
 * 爆款判定 + 兜底补足。
 * 对应 docs/prd/xhs-radar-l3.md §3.2 + §5.1 步骤 7。
 */

import type { NoteRecord, BombThresholds } from '@/types/note';

export function isBomb(note: NoteRecord, thresholds: BombThresholds): boolean {
  if (note.isDeleted) return false;
  if (note.likeToFansRatio === null) return false;
  return note.cesScore >= thresholds.ces && note.likeToFansRatio >= thresholds.likeRatio;
}

/**
 * 兜底：bombs 不足 target 时，从非爆款里按 weightedScore desc 取 top N 补足。
 * 返回的 fallback 笔记会被打上 bombReason='fallback'。
 */
export function fallbackFill(
  bombs: NoteRecord[],
  all: NoteRecord[],
  target: number,
): NoteRecord[] {
  if (bombs.length >= target) return bombs;

  const need = target - bombs.length;
  const bombIds = new Set(bombs.map((n) => n.noteId));
  const candidates = all
    .filter((n) => !bombIds.has(n.noteId) && !n.isDeleted)
    .sort((a, b) => b.weightedScore - a.weightedScore)
    .slice(0, need)
    .map((n) => ({ ...n, bombReason: 'fallback' as const }));

  return [...bombs, ...candidates];
}
