/**
 * 点赞/粉丝比。粉丝数未知时返回 null，由调用方决定是否兜底排序。
 */

export function likeToFansRatio(liked: number, fans: number | null): number | null {
  if (fans === null) return null;
  if (fans <= 0) return liked;
  return liked / fans;
}
