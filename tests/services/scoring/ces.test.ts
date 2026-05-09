import { describe, it, expect } from 'vitest';
import { computeCes } from '@/services/scoring/ces';

describe('computeCes', () => {
  it('applies CES formula liked + collected + 4*comment + 4*share', () => {
    expect(computeCes({ likedCount: 100, collectedCount: 20, commentCount: 5, shareCount: 3 }))
      .toBe(100 + 20 + 5 * 4 + 3 * 4);
  });

  it('returns 0 for all zeros', () => {
    expect(computeCes({ likedCount: 0, collectedCount: 0, commentCount: 0, shareCount: 0 }))
      .toBe(0);
  });

  it('handles real bomb-level numbers (12000 / 3400 / 287 / 156)', () => {
    expect(computeCes({ likedCount: 12000, collectedCount: 3400, commentCount: 287, shareCount: 156 }))
      .toBe(12000 + 3400 + 287 * 4 + 156 * 4);
  });
});
