import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { GlyphSection } from './glyph-section';

const SCORE_ZERO = 0;
const SCORE_TEN = 10;

describe('GlyphSection', () => {
  it('renders section title, description, and cards without practice button', () => {
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
    expect(
      screen.queryByRole('link', { name: 'Practice Gojūon (五十音)' })
    ).not.toBeInTheDocument();
  });

  it('renders practice button when canPractice is true and sectionId is provided', () => {
    const entries = [
      { glyph: 'あ', score: SCORE_TEN, isPracticedToday: true, cooldownActive: false },
    ];

    render(
      <MemoryRouter>
        <GlyphSection
          sectionId="gojuon"
          title="Gojūon (五十音)"
          description="46 basic characters"
          entries={entries}
          loading={false}
          canPractice
        />
      </MemoryRouter>
    );

    const practiceLink = screen.getByRole('link', { name: 'Practice Gojūon (五十音)' });
    expect(practiceLink).toBeInTheDocument();
    expect(practiceLink).toHaveAttribute('href', '/practice?kind=hiragana&section=gojuon');
  });

  it('does not render practice button when canPractice is true but sectionId is omitted', () => {
    const entries = [
      { glyph: 'あ', score: SCORE_TEN, isPracticedToday: true, cooldownActive: false },
    ];

    render(
      <MemoryRouter>
        <GlyphSection
          title="Gojūon (五十音)"
          description="46 basic characters"
          entries={entries}
          loading={false}
          canPractice
        />
      </MemoryRouter>
    );

    expect(
      screen.queryByRole('link', { name: 'Practice Gojūon (五十音)' })
    ).not.toBeInTheDocument();
  });
});
