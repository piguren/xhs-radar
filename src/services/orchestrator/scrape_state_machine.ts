export type ScrapeStatus =
  | 'idle'
  | 'validating'
  | 'scraping'
  | 'captcha_paused'
  | 'detail_fetching'
  | 'complete'
  | 'stopped'
  | 'failed';

const TRANSITIONS: Record<ScrapeStatus, ScrapeStatus[]> = {
  idle: ['validating'],
  validating: ['scraping', 'failed', 'stopped'],
  scraping: ['captcha_paused', 'detail_fetching', 'failed', 'stopped'],
  captcha_paused: ['scraping', 'stopped', 'failed'],
  detail_fetching: ['complete', 'failed', 'stopped'],
  complete: [],
  stopped: [],
  failed: [],
};

export class ScrapeStateMachine {
  private state: ScrapeStatus = 'idle';

  get current(): ScrapeStatus {
    return this.state;
  }

  transition(next: ScrapeStatus): boolean {
    const allowed = TRANSITIONS[this.state];
    if (!allowed.includes(next)) return false;
    this.state = next;
    return true;
  }

  reset(): void {
    this.state = 'idle';
  }
}
