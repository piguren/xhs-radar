import { describe, it, expect } from 'vitest';
import { CandidatePool } from '@/services/orchestrator/candidate_pool';
import type { NoteRecord } from '@/types/note';

const mkNote = (id: string): NoteRecord => ({ noteId: id } as unknown as NoteRecord);

describe('CandidatePool', () => {
  it('starts empty', () => {
    const p = new CandidatePool(200);
    expect(p.size).toBe(0);
    expect(p.notes).toEqual([]);
  });

  it('add deduplicates by noteId', () => {
    const p = new CandidatePool(200);
    expect(p.add([mkNote('a'), mkNote('b'), mkNote('a')])).toBe(2);
    expect(p.size).toBe(2);
    expect(p.add([mkNote('a')])).toBe(0);
    expect(p.size).toBe(2);
  });

  it('respects upper bound', () => {
    const p = new CandidatePool(3);
    p.add([mkNote('a'), mkNote('b'), mkNote('c'), mkNote('d')]);
    expect(p.size).toBe(3);
    expect(p.notes.map((n) => n.noteId)).toEqual(['a', 'b', 'c']);
    expect(p.isFull).toBe(true);
  });

  it('not full when below max', () => {
    const p = new CandidatePool(10);
    p.add([mkNote('a')]);
    expect(p.isFull).toBe(false);
  });
});
