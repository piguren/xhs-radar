import { describe, it, expect, beforeEach } from 'vitest';
import { ScrapeStateMachine } from '@/services/orchestrator/scrape_state_machine';

describe('ScrapeStateMachine', () => {
  let sm: ScrapeStateMachine;

  beforeEach(() => {
    sm = new ScrapeStateMachine();
  });

  it('starts in idle', () => {
    expect(sm.current).toBe('idle');
  });

  it('allows valid transitions: idle -> validating -> scraping -> detail_fetching -> complete', () => {
    expect(sm.transition('validating')).toBe(true);
    expect(sm.transition('scraping')).toBe(true);
    expect(sm.transition('detail_fetching')).toBe(true);
    expect(sm.transition('complete')).toBe(true);
    expect(sm.current).toBe('complete');
  });

  it('rejects invalid transitions: idle -> complete', () => {
    expect(sm.transition('complete')).toBe(false);
    expect(sm.current).toBe('idle');
  });

  it('allows scraping <-> captcha_paused round trip', () => {
    sm.transition('validating');
    sm.transition('scraping');
    expect(sm.transition('captcha_paused')).toBe(true);
    expect(sm.transition('scraping')).toBe(true);
  });

  it('terminal states (complete/failed/stopped) reject further transitions', () => {
    sm.transition('validating');
    sm.transition('failed');
    expect(sm.transition('scraping')).toBe(false);
    expect(sm.current).toBe('failed');
  });

  it('reset returns to idle from any state', () => {
    sm.transition('validating');
    sm.transition('scraping');
    sm.reset();
    expect(sm.current).toBe('idle');
  });
});
