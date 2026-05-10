import { ScrapeStateMachine } from './scrape_state_machine';
import { CandidatePool } from './candidate_pool';
import { ProgressEmitter } from './progress_emitter';
import { isLoggedIn } from '@/services/xhs/login_checker';
import { applyAll, inTimeWindow } from '@/services/scoring/apply_all';
import { fetchNoteDetail } from '@/services/xhs/detail_fetcher';
import { fetchUserFans } from '@/services/xhs/user_fetcher';
import { parseSearchResponse } from '@/services/xhs/search_parser';
import type { NoteRecord, BatchRecord, TimeWindow, BombThresholds } from '@/types/note';

export interface StartScrapePayload {
  batchId: string;
  keywords: string[];
  timeWindow: TimeWindow;
  thresholds: BombThresholds;
  candidatePoolMax: number;
  targetBombCount: number;
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

const MAIN_INJECT_DELAY_MS = 200;
const NAV_RELOAD_DELAY_MS = 600;
const SCROLL_PAUSE_MIN = 800;
const SCROLL_PAUSE_MAX = 1500;
const STALL_THRESHOLD = 3;

export async function handleStartScrape(p: StartScrapePayload): Promise<void> {
  const sm = new ScrapeStateMachine();
  const emit = new ProgressEmitter(p.batchId);

  sm.transition('validating');
  emit.emitStatus('validating');

  if (!(await isLoggedIn())) {
    sm.transition('failed');
    emit.emitStatus('failed');
    return;
  }

  const xhsTab = await chrome.tabs.create({
    url: `https://www.xiaohongshu.com/search?keyword=${encodeURIComponent(p.keywords[0])}`,
    active: false,
  });
  if (!xhsTab.id) {
    sm.transition('failed');
    emit.emitStatus('failed');
    return;
  }
  const tabId = xhsTab.id;

  await chrome.tabs.sendMessage(tabId, { kind: 'BEGIN_INTERCEPT', batchId: p.batchId });
  await sleep(MAIN_INJECT_DELAY_MS);

  sm.transition('scraping');
  emit.emitStatus('scraping');

  const pool = new CandidatePool(p.candidatePoolMax);
  const inbox: NoteRecord[] = [];

  const captureListener = (msg: { kind?: string; batchId?: string; endpoint?: string; payload?: unknown }) => {
    if (msg?.kind === 'NOTES_CAPTURED' && msg.batchId === p.batchId && msg.endpoint === 'search') {
      try {
        inbox.push(...parseSearchResponse(msg.payload as Parameters<typeof parseSearchResponse>[0]));
      } catch {
        /* parse failure ignored */
      }
    }
  };
  chrome.runtime.onMessage.addListener(captureListener);

  let kwIndex = 0;
  let stallCount = 0;
  while (sm.current === 'scraping' && !pool.isFull && kwIndex < p.keywords.length) {
    await chrome.tabs.sendMessage(tabId, { kind: 'SCROLL_ONCE' });
    await sleep(rand(SCROLL_PAUSE_MIN, SCROLL_PAUSE_MAX));

    const before = pool.size;
    const drained = inbox.splice(0);
    pool.add(drained);
    emit.emit({ candidateCount: pool.size, currentKeyword: p.keywords[kwIndex] });

    if (pool.size === before) {
      stallCount++;
      if (stallCount >= STALL_THRESHOLD) {
        kwIndex++;
        if (kwIndex < p.keywords.length) {
          await chrome.tabs.sendMessage(tabId, { kind: 'NAVIGATE_KEYWORD', keyword: p.keywords[kwIndex] });
          // 🔴 Issue #1 fix: page reload resets captureBatchId on content script.
          // Wait for reload + re-arm interceptor before next loop iteration.
          await sleep(NAV_RELOAD_DELAY_MS);
          await chrome.tabs.sendMessage(tabId, { kind: 'BEGIN_INTERCEPT', batchId: p.batchId });
          await sleep(MAIN_INJECT_DELAY_MS);
          stallCount = 0;
        }
      }
    } else {
      stallCount = 0;
    }
  }

  chrome.runtime.onMessage.removeListener(captureListener);
  await chrome.tabs.sendMessage(tabId, { kind: 'END_INTERCEPT' });

  sm.transition('detail_fetching');
  emit.emitStatus('detail_fetching');

  const enriched = pool.notes.map((n) => applyAll(n, p.thresholds, p.timeWindow));
  const topN = Math.min(100, p.targetBombCount * 5);
  const top = [...enriched].sort((a, b) => b.cesScore - a.cesScore).slice(0, topN);

  let detailFetched = 0;
  for (const note of top) {
    if (sm.current !== 'detail_fetching') break;
    const r = await fetchNoteDetail(note.noteId, note.xsecToken);
    if (r.outcome === 'success') {
      note.desc = r.desc;
      note.time = r.time;
      note.tagList = r.tagList;
      note.detailFetchedAt = Date.now();
    } else if (r.outcome === 'deleted') {
      note.isDeleted = true;
    } else if (r.outcome === 'captcha') {
      sm.transition('captcha_paused');
      emit.emitStatus('captcha_paused');
      break;
    } else {
      note.detailFetchFailed = true;
    }
    note.user.fans = await fetchUserFans(note.user.userId);
    if (note.user.fans === null) note.fanFetchFailed = true;
    applyAll(note, p.thresholds, p.timeWindow);
    detailFetched++;
    emit.emit({ detailFetchedCount: detailFetched });
    await sleep(rand(800, 2000));
  }

  const inWindow = enriched.filter((n) => inTimeWindow(n.time, p.timeWindow) && !n.isDeleted);
  const bombs = inWindow.filter((n) => n.isBomb);
  let display: NoteRecord[] = bombs;
  if (bombs.length < p.targetBombCount) {
    const fallback = inWindow
      .filter((n) => !n.isBomb)
      .sort((a, b) => b.weightedScore - a.weightedScore)
      .slice(0, p.targetBombCount - bombs.length)
      .map((n) => ({ ...n, bombReason: 'fallback' as const }));
    display = [...bombs, ...fallback];
  }

  const batch: BatchRecord = {
    batchId: p.batchId,
    createdAt: Date.now(),
    keywords: p.keywords,
    timeWindow: p.timeWindow,
    thresholds: p.thresholds,
    candidatePoolMax: p.candidatePoolMax,
    notes: display,
    candidateCount: pool.size,
    bombCount: bombs.length,
    fallbackCount: display.length - bombs.length,
    status: sm.current === 'captcha_paused' ? 'stopped' : 'complete',
    aiResults: { topicSuggestions: null, angleClusters: null, trendKeywords: null, structureBreakdown: {} },
  };
  await chrome.storage.local.set({ [`batch_${p.batchId}`]: batch });

  if (sm.current === 'detail_fetching') {
    sm.transition('complete');
  }
  emit.emitStatus(sm.current);
}
