import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useInitDb } from '../../helpers/use-init-db';
import { DbGate } from './db-gate';

vi.mock('../../helpers/use-init-db', () => ({
  useInitDb: vi.fn(),
}));

describe('DbGate', () => {
  it('renders children visibly without overlay when status is ready', () => {
    vi.mocked(useInitDb).mockReturnValue({
      isIndicatorVisible: false,
      error: null,
    });

    render(
      <DbGate>
        <span>Content Ready</span>
      </DbGate>
    );

    const child = screen.getByText('Content Ready');
    expect(child).toBeInTheDocument();
    expect(child.parentElement).toHaveClass('flex', 'flex-1', 'flex-col');
    expect(child.parentElement).not.toHaveClass('hidden');
    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders loading overlay and hides children when isIndicatorVisible is true', () => {
    vi.mocked(useInitDb).mockReturnValue({
      isIndicatorVisible: true,
      error: null,
    });

    render(
      <DbGate>
        <span>Content Loading</span>
      </DbGate>
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText('Loading Kana...')).toBeInTheDocument();
    const child = screen.getByText('Content Loading');
    expect(child.parentElement).toHaveClass('hidden', 'flex-1', 'flex-col');
    expect(child.parentElement).not.toHaveClass('flex');
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('renders error overlay and hides children when error is present', () => {
    vi.mocked(useInitDb).mockReturnValue({
      isIndicatorVisible: false,
      error: new Error('Critical DB failure'),
    });

    render(
      <DbGate>
        <span>Content Error</span>
      </DbGate>
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Critical DB failure')).toBeInTheDocument();
    const child = screen.getByText('Content Error');
    expect(child.parentElement).toHaveClass('hidden', 'flex-1', 'flex-col');
    expect(child.parentElement).not.toHaveClass('flex');
    expect(screen.queryByRole('status')).toBeNull();
  });
});
