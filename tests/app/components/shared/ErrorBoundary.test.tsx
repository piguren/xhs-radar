import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/app/components/shared/ErrorBoundary';

function Bomb(): React.ReactElement {
  throw new Error('explode');
}

describe('<ErrorBoundary>', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <p>safe</p>
      </ErrorBoundary>,
    );
    expect(screen.getByText('safe')).toBeInTheDocument();
  });

  it('renders ErrorCard when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/出现意外错误/)).toBeInTheDocument();
    // 'explode' shows in both the message <p> and the stack <pre> — assert at least one
    expect(screen.getAllByText(/explode/).length).toBeGreaterThan(0);
  });
});
