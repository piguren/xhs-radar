import type { NoteRecord } from '@/types/note';

export class CandidatePool {
  private items: NoteRecord[] = [];
  private seen = new Set<string>();

  constructor(private readonly max: number) {}

  get size(): number {
    return this.items.length;
  }

  get isFull(): boolean {
    return this.items.length >= this.max;
  }

  get notes(): NoteRecord[] {
    return this.items;
  }

  add(batch: NoteRecord[]): number {
    let added = 0;
    for (const n of batch) {
      if (this.isFull) break;
      if (this.seen.has(n.noteId)) continue;
      this.seen.add(n.noteId);
      this.items.push(n);
      added++;
    }
    return added;
  }
}
