import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { GlyphCard } from './glyph-card';

const SCORE_ZERO = 0;
const SCORE_FIFTY = 50;

describe('GlyphCard', () => {
  it('renders single character glyph with neutral border when unpracticed today and not loading', () => {
    render(
      <MemoryRouter>
        <GlyphCard
          glyph="あ"
          score={SCORE_ZERO}
          isPracticedToday={false}
          loading={false}
          cooldownActive={false}
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /practice あ/i });
    expect(link).toHaveAttribute('href', '/quiz?glyph=%E3%81%82');
    expect(link).toHaveClass('border-border/60');
    expect(link).not.toHaveClass('ring-primary');
    expect(link.querySelector('svg.lucide-clock')).not.toBeInTheDocument();

    const glyphSpan = screen.getByText('あ');
    expect(glyphSpan).toHaveClass('text-3xl');
    expect(glyphSpan).not.toHaveClass('opacity-0');
  });

  it('renders digraph glyph with colored border and opacity-0 when practiced today and loading', () => {
    render(
      <MemoryRouter>
        <GlyphCard
          glyph="きゃ"
          score={SCORE_FIFTY}
          isPracticedToday={true}
          loading={true}
          cooldownActive={true}
        />
      </MemoryRouter>
    );

    const link = screen.getByRole('link', { name: /practice きゃ/i });
    expect(link).toHaveAttribute('href', '/quiz?glyph=%E3%81%8D%E3%82%83');
    expect(link).toHaveClass('border-primary');
    expect(link).toHaveClass('ring-primary');
    expect(link.querySelector('svg.lucide-clock')).toBeInTheDocument();

    const glyphSpan = screen.getByText('きゃ');
    expect(glyphSpan).toHaveClass('text-2xl');
    expect(glyphSpan).toHaveClass('opacity-0');
  });
});
