/**
 * 时间衰减系数：exp(-lambda * days)，lambda=0.1 (~7 天半衰期)。
 * 对应 docs/prd/xhs-radar-l3.md §3.2。
 */

const LAMBDA = 0.1;
const MS_PER_DAY = 86_400_000;

export function timeDecayFactor(days: number): number {
  if (!Number.isFinite(days) || days < 0) return 1;
  return Math.exp(-LAMBDA * days);
}

export function daysSincePublish(publishTimeMs: number, nowMs: number = Date.now()): number {
  if (!publishTimeMs || publishTimeMs <= 0) return 0;
  if (publishTimeMs > nowMs) return 0;
  return (nowMs - publishTimeMs) / MS_PER_DAY;
}
