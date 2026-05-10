import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottomStatusBar } from '@/app/components/nav/BottomStatusBar';

describe('BottomStatusBar (T-076)', () => {
  it('shows scraping status with candidate count', () => {
    render(
      <BottomStatusBar
        status="scraping"
        progress={{ candidateCount: 137, bombCount: 8, detailFetchedCount: 0, currentKeyword: 'AI' }}
      />,
    );
    expect(screen.getByText(/137/)).toBeInTheDocument();
    expect(screen.getByText(/AI/)).toBeInTheDocument();
    expect(screen.getByText(/抓取中/)).toBeInTheDocument();
  });

  it('shows captcha_paused warning state', () => {
    render(
      <BottomStatusBar
        status="captcha_paused"
        progress={{ candidateCount: 50, bombCount: 0, detailFetchedCount: 0, currentKeyword: null }}
      />,
    );
    expect(screen.getByText(/已暂停/)).toBeInTheDocument();
  });

  it('shows complete state', () => {
    render(
      <BottomStatusBar
        status="complete"
        progress={{ candidateCount: 200, bombCount: 18, detailFetchedCount: 18, currentKeyword: null }}
      />,
    );
    expect(screen.getByText(/已完成/)).toBeInTheDocument();
  });

  it('renders nothing when status is idle', () => {
    const { container } = render(
      <BottomStatusBar
        status="idle"
        progress={{ candidateCount: 0, bombCount: 0, detailFetchedCount: 0, currentKeyword: null }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
