import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { GlyphCard } from './glyph-card';

const SCORE_FIFTY = 50;

describe('GlyphCard', () => {
  it('renders single character glyph with neutral border when unpracticed today', () => {
    render(
      <MemoryRouter>
        <GlyphCard glyph="あ" score={0} isPracticedToday={false} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /practice あ/i });
    expect(link).toHaveAttribute('href', '/quiz?glyph=%E3%81%82');
    expect(link).toHaveClass('border-border/60');
    expect(screen.getByText('あ')).toHaveClass('text-3xl');
  });

  it('renders digraph glyph with colored border when practiced today', () => {
    render(
      <MemoryRouter>
        <GlyphCard glyph="きゃ" score={SCORE_FIFTY} isPracticedToday={true} />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /practice きゃ/i });
    expect(link).toHaveAttribute('href', '/quiz?glyph=%E3%81%8D%E3%82%83');
    expect(link).toHaveClass('border-2');
    expect(link).toHaveClass('border-primary');
    expect(screen.getByText('きゃ')).toHaveClass('text-2xl');
  });
});
