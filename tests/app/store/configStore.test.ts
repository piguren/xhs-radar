import { describe, it, expect, beforeEach } from 'vitest';
import { useConfigStore, CONFIG_INITIAL } from '@/app/store/configStore';

describe('configStore', () => {
  beforeEach(() => {
    useConfigStore.setState({ ...CONFIG_INITIAL });
  });

  it('addKeyword adds a new keyword', () => {
    useConfigStore.getState().addKeyword('AI');
    expect(useConfigStore.getState().keywords).toEqual(['AI']);
  });

  it('addKeyword dedupes case-insensitively', () => {
    useConfigStore.getState().addKeyword('AI');
    useConfigStore.getState().addKeyword('AI');
    useConfigStore.getState().addKeyword('ai');
    expect(useConfigStore.getState().keywords).toEqual(['AI']);
  });

  it('addKeyword caps at 10 entries', () => {
    for (let i = 0; i < 12; i++) useConfigStore.getState().addKeyword(`kw${i}`);
    expect(useConfigStore.getState().keywords.length).toBe(10);
  });

  it('addKeyword rejects empty / >30 char input', () => {
    useConfigStore.getState().addKeyword('');
    useConfigStore.getState().addKeyword('a'.repeat(31));
    expect(useConfigStore.getState().keywords).toEqual([]);
  });

  it('removeKeyword removes the matching entry', () => {
    useConfigStore.getState().addKeyword('AI');
    useConfigStore.getState().addKeyword('Claude');
    useConfigStore.getState().removeKeyword('AI');
    expect(useConfigStore.getState().keywords).toEqual(['Claude']);
  });

  it('setThreshold validates ces range', () => {
    useConfigStore.getState().setThreshold('ces', 200);
    expect(useConfigStore.getState().cesThreshold).toBe(200);
    useConfigStore.getState().setThreshold('ces', 5); // below 10 -> ignored
    expect(useConfigStore.getState().cesThreshold).toBe(200);
  });

  it('setThreshold validates likeRatio range', () => {
    useConfigStore.getState().setThreshold('likeRatio', 1.5);
    expect(useConfigStore.getState().likeRatioThreshold).toBe(1.5);
    useConfigStore.getState().setThreshold('likeRatio', 50); // above 10 -> ignored
    expect(useConfigStore.getState().likeRatioThreshold).toBe(1.5);
  });

  it('setTargetBombCount clamps to [1,100]', () => {
    useConfigStore.getState().setTargetBombCount(500);
    expect(useConfigStore.getState().targetBombCount).toBe(100);
    useConfigStore.getState().setTargetBombCount(0);
    expect(useConfigStore.getState().targetBombCount).toBe(1);
  });

  it('reset restores initial values', () => {
    useConfigStore.getState().addKeyword('AI');
    useConfigStore.getState().setApiKey('sk-test');
    useConfigStore.getState().reset();
    expect(useConfigStore.getState().keywords).toEqual([]);
    expect(useConfigStore.getState().deepseekApiKey).toBe('');
  });
});
