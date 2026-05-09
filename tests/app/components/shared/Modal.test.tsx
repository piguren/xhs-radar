import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '@/app/components/shared/Modal';

describe('<Modal>', () => {
  it('renders title and children when open', () => {
    render(
      <Modal isOpen onClose={() => {}} title="测试">
        <p>内容</p>
      </Modal>,
    );
    expect(screen.getByText('测试')).toBeInTheDocument();
    expect(screen.getByText('内容')).toBeInTheDocument();
  });

  it('returns null when closed', () => {
    const { container } = render(
      <Modal isOpen={false} onClose={() => {}}>
        <p>x</p>
      </Modal>,
    );
    expect(container.firstChild).toBeNull();
  });

  it('triggers onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        <p>x</p>
      </Modal>,
    );
    fireEvent.mouseDown(screen.getByRole('dialog'));
    expect(onClose).toHaveBeenCalled();
  });

  it('triggers onClose on Escape', () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose}>
        <p>x</p>
      </Modal>,
    );
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});
