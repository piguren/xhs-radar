import { describe, it, expect } from 'vitest';
import { isBomb, fallbackFill } from '@/services/scoring/filter';
import type { NoteRecord, BombThresholds } from '@/types/note';

const baseNote = (overrides: Partial<NoteRecord>): NoteRecord => ({
  noteId: 'n1',
  xsecToken: 'tok',
  modelType: 'note',
  title: '',
  time: 0,
  lastUpdateTime: 0,
  tagList: [],
  user: { userId: 'u1', nickname: 'a', avatar: '', fans: 1000 },
  interactInfo: { likedCount: 0, collectedCount: 0, commentCount: 0, shareCount: 0 },
  desc: null,
  detailFetchedAt: null,
  cesScore: 0,
  likeToFansRatio: 0,
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

const thresholds: BombThresholds = { ces: 100, likeRatio: 0.5 };

describe('isBomb', () => {
  it('returns true when both ces and ratio exceed thresholds', () => {
    expect(isBomb(baseNote({ cesScore: 200, likeToFansRatio: 1 }), thresholds)).toBe(true);
  });

  it('returns false when ces below threshold', () => {
    expect(isBomb(baseNote({ cesScore: 50, likeToFansRatio: 1 }), thresholds)).toBe(false);
  });

  it('returns false when ratio below threshold', () => {
    expect(isBomb(baseNote({ cesScore: 200, likeToFansRatio: 0.1 }), thresholds)).toBe(false);
  });

  it('returns false when likeToFansRatio is null (fans unknown)', () => {
    expect(isBomb(baseNote({ cesScore: 9999, likeToFansRatio: null }), thresholds)).toBe(false);
  });

  it('returns false when isDeleted', () => {
    expect(isBomb(baseNote({ cesScore: 9999, likeToFansRatio: 9, isDeleted: true }), thresholds))
      .toBe(false);
  });
});

describe('fallbackFill', () => {
  it('fills up to target with non-bomb notes sorted by weightedScore desc', () => {
    const bombs: NoteRecord[] = [baseNote({ noteId: 'b1', isBomb: true })];
    const all: NoteRecord[] = [
      ...bombs,
      baseNote({ noteId: 'n2', weightedScore: 50 }),
      baseNote({ noteId: 'n3', weightedScore: 200 }),
      baseNote({ noteId: 'n4', weightedScore: 100 }),
    ];
    const out = fallbackFill(bombs, all, 3);
    expect(out.length).toBe(3);
    expect(out.slice(1).map(n => n.noteId)).toEqual(['n3', 'n4']);
    expect(out.slice(1).every(n => n.bombReason === 'fallback')).toBe(true);
  });

  it('returns bombs as-is when already at or above target', () => {
    const bombs: NoteRecord[] = [
      baseNote({ noteId: 'b1', isBomb: true }),
      baseNote({ noteId: 'b2', isBomb: true }),
    ];
    const out = fallbackFill(bombs, bombs, 2);
    expect(out.length).toBe(2);
    expect(out.every(n => n.bombReason !== 'fallback')).toBe(true);
  });

  it('skips deleted notes when filling', () => {
    const bombs: NoteRecord[] = [];
    const all: NoteRecord[] = [
      baseNote({ noteId: 'd1', weightedScore: 999, isDeleted: true }),
      baseNote({ noteId: 'n2', weightedScore: 100 }),
    ];
    const out = fallbackFill(bombs, all, 5);
    expect(out.map(n => n.noteId)).toEqual(['n2']);
  });
});
