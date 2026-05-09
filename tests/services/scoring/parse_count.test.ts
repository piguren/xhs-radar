import { describe, it, expect } from 'vitest';
import { parseCount } from '@/services/scoring/parse_count';

describe('parseCount', () => {
  // L3 §4.2 TC A1-T4 "1.2万" → 12000
  it('parses "1.2万" to 12000', () => expect(parseCount('1.2万')).toBe(12000));
  it('parses "10万" to 100000', () => expect(parseCount('10万')).toBe(100000));
  it('parses "8.6万" to 86000', () => expect(parseCount('8.6万')).toBe(86000));

  // 千 unit
  it('parses "8.6千" to 8600', () => expect(parseCount('8.6千')).toBe(8600));

  // L3 §4.2 TC A1-T5 "999+" → 999
  it('parses "999+" stripping plus', () => expect(parseCount('999+')).toBe(999));
  it('parses "10万+" to 100000', () => expect(parseCount('10万+')).toBe(100000));

  // L3 §4.2 TC A1-T6 empty → 0
  it('parses empty string to 0', () => expect(parseCount('')).toBe(0));
  it('parses whitespace to 0', () => expect(parseCount('   ')).toBe(0));

  // simple integer
  it('parses "287" to 287', () => expect(parseCount('287')).toBe(287));

  // already number
  it('passes number through', () => expect(parseCount(500)).toBe(500));

  // bad input → 0 (defensive)
  it('returns 0 for null', () => expect(parseCount(null)).toBe(0));
  it('returns 0 for undefined', () => expect(parseCount(undefined)).toBe(0));
  it('returns 0 for unparseable string', () => expect(parseCount('xyz')).toBe(0));

  // emoji decoration tolerated
  it('strips emoji prefix', () => expect(parseCount('👍 1234')).toBe(1234));
});
