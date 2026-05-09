import { describe, it, expect } from 'vitest';
import { timeDecayFactor, daysSincePublish } from '@/services/scoring/decay';

describe('decay', () => {
  it('decay factor at 0 days is 1', () => {
    expect(timeDecayFactor(0)).toBeCloseTo(1, 5);
  });

  it('decay factor at 7 days is approx 0.4966 (lambda 0.1)', () => {
    expect(timeDecayFactor(7)).toBeCloseTo(Math.exp(-0.7), 5);
  });

  it('decay factor decreases monotonically', () => {
    expect(timeDecayFactor(1)).toBeGreaterThan(timeDecayFactor(2));
    expect(timeDecayFactor(2)).toBeGreaterThan(timeDecayFactor(7));
    expect(timeDecayFactor(7)).toBeGreaterThan(timeDecayFactor(30));
  });

  it('daysSincePublish computes integer days from millis', () => {
    const now = 10 * 86_400_000;
    const t = 3 * 86_400_000;
    expect(daysSincePublish(t, now)).toBeCloseTo(7, 5);
  });

  it('returns 0 days when time is 0 or future', () => {
    const now = 86_400_000;
    expect(daysSincePublish(0, now)).toBe(0);
    expect(daysSincePublish(now + 86_400_000, now)).toBe(0);
  });
});
