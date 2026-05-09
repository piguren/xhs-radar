import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { KeywordChipsInput } from '@/app/components/config/KeywordChipsInput';
import { useConfigStore, CONFIG_INITIAL } from '@/app/store/configStore';

describe('<KeywordChipsInput>', () => {
  beforeEach(() => {
    useConfigStore.setState({ ...CONFIG_INITIAL });
  });

  it('adds keyword on Enter (AC-001)', () => {
    render(<KeywordChipsInput />);
    const input = screen.getByPlaceholderText(/输入后按 Enter/);
    fireEvent.change(input, { target: { value: 'AI' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useConfigStore.getState().keywords).toEqual(['AI']);
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('shows error and does not add when keyword > 30 chars (AC-003)', () => {
    render(<KeywordChipsInput />);
    const input = screen.getByPlaceholderText(/输入后按 Enter/);
    fireEvent.change(input, { target: { value: 'a'.repeat(31) } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useConfigStore.getState().keywords).toEqual([]);
    expect(screen.getByText(/1–30 字/)).toBeInTheDocument();
  });

  it('rejects duplicate (AC-002)', () => {
    useConfigStore.getState().addKeyword('AI');
    render(<KeywordChipsInput />);
    const input = screen.getByPlaceholderText(/输入后按 Enter/);
    fireEvent.change(input, { target: { value: 'ai' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(useConfigStore.getState().keywords).toEqual(['AI']);
    expect(screen.getByText('该关键词已存在')).toBeInTheDocument();
  });

  it('disables input at limit of 10 (AC-004)', () => {
    for (let i = 0; i < 10; i++) useConfigStore.getState().addKeyword(`kw${i}`);
    render(<KeywordChipsInput />);
    const input = screen.getByPlaceholderText(/已达上限 10 个/);
    expect(input).toBeDisabled();
  });

  it('removes keyword via × button', () => {
    useConfigStore.getState().addKeyword('AI');
    render(<KeywordChipsInput />);
    fireEvent.click(screen.getByLabelText('移除 AI'));
    expect(useConfigStore.getState().keywords).toEqual([]);
  });
});
