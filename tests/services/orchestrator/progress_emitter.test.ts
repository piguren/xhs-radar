import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProgressEmitter } from '@/services/orchestrator/progress_emitter';

describe('ProgressEmitter', () => {
  let sendMessageMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    sendMessageMock = vi.fn();
    (global as any).chrome = { runtime: { sendMessage: sendMessageMock } };
  });

  it('emits SCRAPE_PROGRESS message with patch', () => {
    const e = new ProgressEmitter('btch_1');
    e.emit({ candidateCount: 50, currentKeyword: 'AI' });
    expect(sendMessageMock).toHaveBeenCalledWith({
      kind: 'SCRAPE_PROGRESS',
      batchId: 'btch_1',
      patch: { candidateCount: 50, currentKeyword: 'AI' },
    });
  });

  it('emits final status separately', () => {
    const e = new ProgressEmitter('btch_1');
    e.emitStatus('complete');
    expect(sendMessageMock).toHaveBeenCalledWith({
      kind: 'SCRAPE_STATUS',
      batchId: 'btch_1',
      status: 'complete',
    });
  });
});
