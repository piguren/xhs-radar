import { describe, it, expect } from 'vitest';
import { likeToFansRatio } from '@/services/scoring/ratio';

describe('likeToFansRatio', () => {
  it('computes liked / fans', () => {
    expect(likeToFansRatio(12000, 8623)).toBeCloseTo(12000 / 8623, 5);
  });

  it('returns null when fans is null (unknown)', () => {
    expect(likeToFansRatio(100, null)).toBeNull();
  });

  it('clamps fans to 1 when 0 (avoid div by zero)', () => {
    expect(likeToFansRatio(50, 0)).toBe(50);
  });

  it('returns 0 when liked is 0', () => {
    expect(likeToFansRatio(0, 1000)).toBe(0);
  });
});
