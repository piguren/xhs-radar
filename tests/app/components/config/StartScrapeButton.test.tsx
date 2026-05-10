import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StartScrapeButton } from '@/app/components/config/StartScrapeButton';
import { useScrapeStore, SCRAPE_INITIAL } from '@/app/store/scrapeStore';
import { useConfigStore, CONFIG_INITIAL } from '@/app/store/configStore';

describe('StartScrapeButton — 按状态禁用', () => {
  beforeEach(() => {
    useScrapeStore.setState({ ...SCRAPE_INITIAL });
    useConfigStore.setState({ ...CONFIG_INITIAL, keywords: ['kw1'] });
  });

  it('is enabled and triggers onStart when status=idle and keywords present', () => {
    const onStart = vi.fn();
    render(<StartScrapeButton onStart={onStart} />);
    const btn = screen.getByRole('button', { name: /开始抓取/ });
    expect(btn).not.toBeDisabled();
    fireEvent.click(btn);
    expect(onStart).toHaveBeenCalled();
  });

  it('is disabled while status=scraping (in-flight)', () => {
    useScrapeStore.setState({ status: 'scraping' });
    const onStart = vi.fn();
    render(<StartScrapeButton onStart={onStart} />);
    const btn = screen.getByRole('button');
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onStart).not.toHaveBeenCalled();
  });

  it('is disabled while status=validating', () => {
    useScrapeStore.setState({ status: 'validating' });
    render(<StartScrapeButton onStart={() => {}} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is disabled while status=detail_fetching', () => {
    useScrapeStore.setState({ status: 'detail_fetching' });
    render(<StartScrapeButton onStart={() => {}} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is enabled again when status=complete', () => {
    useScrapeStore.setState({ status: 'complete' });
    render(<StartScrapeButton onStart={() => {}} />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('is enabled again when status=failed', () => {
    useScrapeStore.setState({ status: 'failed' });
    render(<StartScrapeButton onStart={() => {}} />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });
});
