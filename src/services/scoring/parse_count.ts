/**
 * 把小红书前端展示的计数字符串（"1.2万" / "999+" / ""）解析为 number。
 * 对应 docs/prd/xhs-radar-l3.md §4.2 TC A1-T4/T5/T6。
 */

export function parseCount(input: unknown): number {
  if (typeof input === 'number') return Number.isFinite(input) ? input : 0;
  if (input === null || input === undefined) return 0;
  if (typeof input !== 'string') return 0;

  let s = input.trim();
  if (!s) return 0;

  // 去掉 emoji / 非数字 + 单位前缀
  s = s.replace(/[^\d.万千+]/g, '');
  s = s.replace(/\+$/, '');
  if (!s) return 0;

  if (s.includes('万')) {
    const n = parseFloat(s.replace('万', ''));
    return Number.isFinite(n) ? Math.round(n * 10_000) : 0;
  }
  if (s.includes('千')) {
    const n = parseFloat(s.replace('千', ''));
    return Number.isFinite(n) ? Math.round(n * 1_000) : 0;
  }

  const n = parseFloat(s);
  return Number.isFinite(n) ? Math.round(n) : 0;
}
