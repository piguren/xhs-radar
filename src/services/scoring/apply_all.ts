/**
 * 单笔记的全部本地计算：CES / decay / ratio / isBomb / weightedScore。
 * 在抓取主流程 §5.1 中调用：先无 fans 时算一次（粗）；详情接口拿到 fans 后再算一次（细）。
 */

import type { NoteRecord, BombThresholds, TimeWindow } from '@/types/note';
import { computeCes } from './ces';
import { likeToFansRatio } from './ratio';
import { daysSincePublish, timeDecayFactor } from './decay';
import { isBomb } from './filter';
import { inTimeWindow } from './in_time_window';

export function applyAll(
  note: NoteRecord,
  thresholds: BombThresholds,
  _window: TimeWindow,
  nowMs: number = Date.now(),
): NoteRecord {
  note.cesScore = computeCes(note.interactInfo);
  note.likeToFansRatio = likeToFansRatio(note.interactInfo.likedCount, note.user.fans);
  note.daysSincePublish = daysSincePublish(note.time, nowMs);
  note.timeDecayFactor = timeDecayFactor(note.daysSincePublish);
  note.weightedScore = note.cesScore * note.timeDecayFactor;
  note.isBomb = isBomb(note, thresholds);
  note.bombReason = note.isBomb ? 'super' : 'not_bomb';
  return note;
}

export { inTimeWindow };
