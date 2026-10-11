import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { GlyphSection } from './glyph-section';

describe('GlyphSection', () => {
  it('renders section title, description, and cards', () => {
    const entries = [
      { glyph: 'あ', score: 0, isPracticedToday: false },
      { glyph: 'い', score: 10, isPracticedToday: true },
    ];

    render(
      <MemoryRouter>
        <GlyphSection title="Gojūon (五十音)" description="46 basic characters" entries={entries} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 2, name: 'Gojūon (五十音)' })).toBeInTheDocument();
    expect(screen.getByText('46 basic characters')).toBeInTheDocument();
    expect(screen.getByText('あ')).toBeInTheDocument();
    expect(screen.getByText('い')).toBeInTheDocument();
  });
});
