import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import type { Route } from './+types/route';
import { VITE_SESSION_COOKIE_DATA_NAME } from '../../helpers/config';
import Page, { clientLoader, getInitials, HydrateFallback, meta } from './route';

const EXPECTED_META_COUNT = 2;

describe('Profile Route', () => {
  it('returns expected meta tags', () => {
    const tags = meta({} as unknown as Route.MetaArgs);
    expect(tags).toHaveLength(EXPECTED_META_COUNT);
    expect(tags[0]).toEqual({ title: 'Profile - Kana' });
  });

  it('provides default loader data with null user when storage is empty', () => {
    document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    const data = clientLoader();
    expect(data).toEqual({ user: null });
  });

  it('provides loader data with user when stored in cookie', () => {
    const mockUser = {
      name: 'Ken',
      email: 'ken@example.com',
    };
    document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=${encodeURIComponent(JSON.stringify(mockUser))}; Path=/`;
    const data = clientLoader();
    expect(data).toEqual({ user: mockUser });
    document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  });

  it('renders HydrateFallback with loading spinner', () => {
    render(<HydrateFallback {...({} as unknown as Route.HydrateFallbackProps)} />);
    expect(screen.getByLabelText('Loading profile')).toBeInTheDocument();
  });

  it('renders logged out state when user is null', () => {
    render(
      <MemoryRouter>
        <Page {...({} as unknown as Route.ComponentProps)} loaderData={{ user: null }} />
      </MemoryRouter>
    );

    const backLink = screen.getByRole('link', { name: /home/i });
    expect(backLink).toBeInTheDocument();
    expect(backLink).toHaveAttribute('href', '/');

    expect(screen.getByRole('heading', { level: 1, name: 'Welcome back!' })).toBeInTheDocument();
    expect(
      screen.getByText(/sign in to sync your progress across all your devices/i)
    ).toBeInTheDocument();

    const signInLink = screen.getByRole('link', { name: /sign in/i });
    expect(signInLink).toBeInTheDocument();
    expect(signInLink).toHaveAttribute('href', '/sign-in');

    const createAccountLink = screen.getByRole('link', { name: /create account/i });
    expect(createAccountLink).toBeInTheDocument();
    expect(createAccountLink).toHaveAttribute('href', '/create-account');
  });

  it('renders logged in state with multi-word name and allows clicking sign out', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Page
          {...({} as unknown as Route.ComponentProps)}
          loaderData={{ user: { name: 'Alice Smith', email: 'alice@example.com' } }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
    expect(screen.getByRole('heading', { level: 1, name: 'Alice Smith' })).toBeInTheDocument();
    expect(screen.getByText('AS')).toBeInTheDocument();
    expect(screen.getByText(/last sync: sep 13th, 2026 14:20:00/i)).toBeInTheDocument();

    const signOutBtn = screen.getByRole('button', { name: /sign out/i });
    expect(signOutBtn).toBeInTheDocument();
    await user.click(signOutBtn);
  });

  it('renders logged in state with single-word name', () => {
    render(
      <MemoryRouter>
        <Page
          {...({} as unknown as Route.ComponentProps)}
          loaderData={{ user: { name: 'Ken', email: 'ken@example.com' } }}
        />
      </MemoryRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Ken' })).toBeInTheDocument();
    expect(screen.getByText('K')).toBeInTheDocument();
  });

  it('renders logged in state with empty name falling back to default user icon', () => {
    render(
      <MemoryRouter>
        <Page
          {...({} as unknown as Route.ComponentProps)}
          loaderData={{ user: { name: '   ', email: 'empty@example.com' } }}
        />
      </MemoryRouter>
    );

    expect(screen.getByText(/last sync:/i)).toBeInTheDocument();
  });

  it('computes initials correctly in getInitials helper', () => {
    expect(getInitials('')).toBe('');
    expect(getInitials('   ')).toBe('');
    expect(getInitials('Alice')).toBe('A');
    expect(getInitials('Alice Smith')).toBe('AS');
    expect(getInitials('Alice Bob Smith')).toBe('AS');
  });
});
