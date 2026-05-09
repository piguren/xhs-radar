import { describe, it, expect } from 'vitest';
import { applyAll } from '@/services/scoring/apply_all';
import type { NoteRecord, BombThresholds, TimeWindow } from '@/types/note';

const DAY = 86_400_000;
const NOW = 100 * DAY;

const baseNote = (overrides: Partial<NoteRecord>): NoteRecord => ({
  noteId: 'n1',
  xsecToken: 'tok',
  modelType: 'note',
  title: '',
  time: NOW - 3 * DAY,
  lastUpdateTime: 0,
  tagList: [],
  user: { userId: 'u1', nickname: 'a', avatar: '', fans: 1000 },
  interactInfo: { likedCount: 1500, collectedCount: 200, commentCount: 30, shareCount: 10 },
  desc: null,
  detailFetchedAt: null,
  cesScore: 0,
  likeToFansRatio: null,
  daysSincePublish: 0,
  timeDecayFactor: 1,
  weightedScore: 0,
  isBomb: false,
  bombReason: 'not_bomb',
  clusterLabel: null,
  detailFetchFailed: false,
  fanFetchFailed: false,
  isDeleted: false,
  ...overrides,
});

describe('applyAll', () => {
  const thresholds: BombThresholds = { ces: 1000, likeRatio: 0.5 };
  const window: TimeWindow = { type: 'preset', days: 7 };

  it('computes ces / ratio / decay / weightedScore in place', () => {
    const n = baseNote({});
    const r = applyAll(n, thresholds, window, NOW);
    expect(r.cesScore).toBe(1500 + 200 + 30 * 4 + 10 * 4);
    expect(r.likeToFansRatio).toBeCloseTo(1.5, 5);
    expect(r.daysSincePublish).toBeCloseTo(3, 5);
    expect(r.timeDecayFactor).toBeCloseTo(Math.exp(-0.3), 5);
    expect(r.weightedScore).toBeCloseTo(r.cesScore * r.timeDecayFactor, 5);
  });

  it('marks isBomb when above thresholds', () => {
    const n = baseNote({});
    applyAll(n, thresholds, window, NOW);
    expect(n.isBomb).toBe(true);
    expect(n.bombReason).toBe('super');
  });

  it('isBomb=false when ratio is null (fans unknown)', () => {
    const n = baseNote({ user: { userId: 'u', nickname: 'a', avatar: '', fans: null } });
    applyAll(n, thresholds, window, NOW);
    expect(n.likeToFansRatio).toBeNull();
    expect(n.isBomb).toBe(false);
  });
});
