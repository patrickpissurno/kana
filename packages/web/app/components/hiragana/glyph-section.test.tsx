import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { GlyphSection } from './glyph-section';

const SCORE_ZERO = 0;
const SCORE_TEN = 10;

describe('GlyphSection', () => {
  it('renders section title, description, and cards with loading prop', () => {
    const entries = [
      { glyph: 'あ', score: SCORE_ZERO, isPracticedToday: false, cooldownActive: false },
      { glyph: 'い', score: SCORE_TEN, isPracticedToday: true, cooldownActive: true },
    ];

    render(
      <MemoryRouter>
        <GlyphSection
          title="Gojūon (五十音)"
          description="46 basic characters"
          entries={entries}
          loading={false}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Gojūon (五十音)' })).toBeInTheDocument();
    expect(screen.getByText('46 basic characters')).toBeInTheDocument();
    expect(screen.getByText('あ')).toBeInTheDocument();
    expect(screen.getByText('い')).toBeInTheDocument();
  });
});
