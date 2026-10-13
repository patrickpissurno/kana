import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { Route } from './+types/route';
import Page, { meta } from './route';

const EXPECTED_META_COUNT = 2;

describe('Index Route', () => {
  it('returns expected meta tags', () => {
    const tags = meta({} as unknown as Route.MetaArgs);
    expect(tags).toHaveLength(EXPECTED_META_COUNT);
    expect(tags[0]).toEqual({ title: 'Kana - Learn Japanese' });
  });

  it('renders landing hero and link to Hiragana page', () => {
    render(
      <MemoryRouter>
        <Page {...({} as unknown as Route.ComponentProps)} />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Kana' })).toBeInTheDocument();
    expect(screen.getByText('かな')).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /practice hiragana/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/hiragana');

    const profileLink = screen.getByRole('link', { name: /profile/i });
    expect(profileLink).toBeInTheDocument();
    expect(profileLink).toHaveAttribute('href', '/profile');
  });
});
