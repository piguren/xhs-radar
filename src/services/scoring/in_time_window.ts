/**
 * 时间窗口判定。preset / custom 两种模式。
 */

export type TimeWindow =
  | { type: 'preset'; days: 3 | 7 | 30 }
  | { type: 'custom'; start: number; end: number };

const MS_PER_DAY = 86_400_000;

export function inTimeWindow(
  publishTimeMs: number,
  window: TimeWindow,
  nowMs: number = Date.now(),
): boolean {
  if (!publishTimeMs || publishTimeMs <= 0) return false;
  if (window.type === 'preset') {
    return publishTimeMs >= nowMs - window.days * MS_PER_DAY && publishTimeMs <= nowMs;
  }
  // custom
  return publishTimeMs >= window.start && publishTimeMs <= window.end;
}
