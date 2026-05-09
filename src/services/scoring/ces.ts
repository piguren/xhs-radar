/**
 * CES 综合评分计算。公式：liked + collected + 4*comment + 4*share。
 * 关注权重 8 在前端拿不到，一期不计入（详见 docs/prd/xhs-radar-l3.md §3.2）。
 */

export interface InteractCounts {
  likedCount: number;
  collectedCount: number;
  commentCount: number;
  shareCount: number;
}

export function computeCes(c: InteractCounts): number {
  return c.likedCount + c.collectedCount + 4 * c.commentCount + 4 * c.shareCount;
}
