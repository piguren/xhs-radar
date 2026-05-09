import { describe, it, expect } from 'vitest';
import { inTimeWindow, type TimeWindow } from '@/services/scoring/in_time_window';

const DAY = 86_400_000;

describe('inTimeWindow', () => {
  // Use a fixed "now" for reproducibility
  const now = 30 * DAY;

  it('preset 7 days includes a 5-day-old note', () => {
    const w: TimeWindow = { type: 'preset', days: 7 };
    expect(inTimeWindow(now - 5 * DAY, w, now)).toBe(true);
  });

  it('preset 7 days excludes a 10-day-old note', () => {
    const w: TimeWindow = { type: 'preset', days: 7 };
    expect(inTimeWindow(now - 10 * DAY, w, now)).toBe(false);
  });

  it('preset 30 days includes a 25-day-old note', () => {
    const w: TimeWindow = { type: 'preset', days: 30 };
    expect(inTimeWindow(now - 25 * DAY, w, now)).toBe(true);
  });

  it('custom range includes when in range', () => {
    const w: TimeWindow = { type: 'custom', start: now - 10 * DAY, end: now - 2 * DAY };
    expect(inTimeWindow(now - 5 * DAY, w, now)).toBe(true);
  });

  it('custom range excludes when before start', () => {
    const w: TimeWindow = { type: 'custom', start: now - 5 * DAY, end: now };
    expect(inTimeWindow(now - 10 * DAY, w, now)).toBe(false);
  });

  it('custom range excludes when after end', () => {
    const w: TimeWindow = { type: 'custom', start: now - 10 * DAY, end: now - 5 * DAY };
    expect(inTimeWindow(now - 2 * DAY, w, now)).toBe(false);
  });

  it('time === 0 (unknown) returns false', () => {
    const w: TimeWindow = { type: 'preset', days: 30 };
    expect(inTimeWindow(0, w, now)).toBe(false);
  });
});
