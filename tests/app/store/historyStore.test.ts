import { describe, it, expect, beforeEach } from 'vitest';
import { useHistoryStore, HISTORY_INITIAL } from '@/app/store/historyStore';
import type { BatchRecord } from '@/types/note';

const mkBatch = (id: string, ts: number): BatchRecord => ({
  batchId: id,
  createdAt: ts,
  keywords: ['x'],
  timeWindow: { type: 'preset', days: 7 },
  thresholds: { ces: 100, likeRatio: 0.5 },
  candidatePoolMax: 200,
  notes: [],
  candidateCount: 0,
  bombCount: 0,
  fallbackCount: 0,
  status: 'complete',
  aiResults: { topicSuggestions: null, angleClusters: null, trendKeywords: null, structureBreakdown: {} },
});

describe('historyStore', () => {
  beforeEach(() => {
    useHistoryStore.setState({ ...HISTORY_INITIAL });
  });

  it('push adds a batch as the newest entry', () => {
    useHistoryStore.getState().push(mkBatch('b1', 1));
    expect(useHistoryStore.getState().entries[0].batchId).toBe('b1');
  });

  it('push maintains createdAt desc order', () => {
    useHistoryStore.getState().push(mkBatch('b1', 100));
    useHistoryStore.getState().push(mkBatch('b2', 200));
    useHistoryStore.getState().push(mkBatch('b3', 50));
    const ids = useHistoryStore.getState().entries.map((e) => e.batchId);
    expect(ids).toEqual(['b2', 'b1', 'b3']);
  });

  it('push caps at 10 entries (oldest dropped)', () => {
    for (let i = 0; i < 12; i++) {
      useHistoryStore.getState().push(mkBatch(`b${i}`, i));
    }
    expect(useHistoryStore.getState().entries.length).toBe(10);
    // newest (b11) at top, oldest (b0, b1) dropped
    expect(useHistoryStore.getState().entries[0].batchId).toBe('b11');
    expect(useHistoryStore.getState().entries.map((e) => e.batchId)).not.toContain('b0');
    expect(useHistoryStore.getState().entries.map((e) => e.batchId)).not.toContain('b1');
  });

  it('removeById removes a specific entry', () => {
    useHistoryStore.getState().push(mkBatch('b1', 1));
    useHistoryStore.getState().push(mkBatch('b2', 2));
    useHistoryStore.getState().removeById('b1');
    expect(useHistoryStore.getState().entries.map((e) => e.batchId)).toEqual(['b2']);
  });
});
