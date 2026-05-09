import { describe, it, expect, beforeEach } from 'vitest';
import { useFavoritesStore, FAVORITES_INITIAL } from '@/app/store/favoritesStore';
import type { NoteRecord } from '@/types/note';

const mkNote = (id: string): NoteRecord => ({
  noteId: id,
  xsecToken: 'tok',
  modelType: 'note',
  title: `Title ${id}`,
  time: 0,
  lastUpdateTime: 0,
  tagList: [],
  user: { userId: 'u1', nickname: 'a', avatar: '', fans: 100 },
  interactInfo: { likedCount: 50, collectedCount: 5, commentCount: 2, shareCount: 1 },
  desc: 'desc',
  detailFetchedAt: 0,
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
});

describe('favoritesStore', () => {
  beforeEach(() => {
    useFavoritesStore.setState({ ...FAVORITES_INITIAL });
  });

  it('add stores a snapshot keyed by noteId', () => {
    useFavoritesStore.getState().add(mkNote('n1'), 'btch_1');
    const fav = useFavoritesStore.getState().byNoteId['n1'];
    expect(fav.snapshot.title).toBe('Title n1');
    expect(fav.sourceBatchId).toBe('btch_1');
    expect(fav.favoritedAt).toBeGreaterThan(0);
  });

  it('isFavorited returns true after add', () => {
    useFavoritesStore.getState().add(mkNote('n1'), 'b');
    expect(useFavoritesStore.getState().isFavorited('n1')).toBe(true);
    expect(useFavoritesStore.getState().isFavorited('n2')).toBe(false);
  });

  it('remove deletes by noteId', () => {
    useFavoritesStore.getState().add(mkNote('n1'), 'b');
    useFavoritesStore.getState().remove('n1');
    expect(useFavoritesStore.getState().isFavorited('n1')).toBe(false);
  });

  it('list returns entries sorted by favoritedAt desc', async () => {
    useFavoritesStore.getState().add(mkNote('n1'), 'b');
    await new Promise((r) => setTimeout(r, 5));
    useFavoritesStore.getState().add(mkNote('n2'), 'b');
    const list = useFavoritesStore.getState().list();
    expect(list.map((e) => e.noteId)).toEqual(['n2', 'n1']);
  });
});
