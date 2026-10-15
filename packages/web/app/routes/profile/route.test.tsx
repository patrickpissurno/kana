import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { format } from 'date-fns';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { logout } from '~/endpoints/auth/logout';
import type { Route } from './+types/route';
import { VITE_SESSION_COOKIE_DATA_NAME } from '../../helpers/config';
import { setLastSyncedTimestamp } from '../../helpers/sync-storage';
import { mockActionArgs } from '../../mocks/react-router/action';
import Page, { clientAction, clientLoader, getInitials, HydrateFallback, meta } from './route';

const EXPECTED_META_COUNT = 2;
const TEST_TIMESTAMP = 1700000000000;

let mockActionData: unknown = null;
let mockNavigationState: 'idle' | 'submitting' | 'loading' = 'idle';

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useActionData: () => mockActionData,
    useNavigation: () => ({
      state: mockNavigationState,
      location: undefined,
      formMethod: undefined,
      formAction: undefined,
      formEncType: undefined,
      formData: undefined,
      json: undefined,
      text: undefined,
    }),
  };
});

vi.mock('~/endpoints/auth/logout', () => ({
  logout: vi.fn(),
}));

describe('Profile Route', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockActionData = null;
    mockNavigationState = 'idle';
  });

  function renderRoute(loaderData: Route.ComponentProps['loaderData']) {
    const router = createMemoryRouter(
      [
        {
          path: '/profile',
          element: <Page {...({} as unknown as Route.ComponentProps)} loaderData={loaderData} />,
          action: () => ({ success: true }),
        },
      ],
      { initialEntries: ['/profile'] }
    );
    return render(<RouterProvider router={router} />);
  }

  describe('meta', () => {
    it('returns expected meta tags', () => {
      const tags = meta({} as unknown as Route.MetaArgs);
      expect(tags).toHaveLength(EXPECTED_META_COUNT);
      expect(tags[0]).toEqual({ title: 'Profile - Kana' });
    });
  });

  describe('clientLoader', () => {
    it('provides default loader data with null user and null timestamp when storage is empty', () => {
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
      const data = clientLoader();
      expect(data).toEqual({ user: null, lastSyncTimestamp: null });
    });

    it('provides loader data with user and timestamp when stored in cookie and localStorage', () => {
      const mockUser = {
        name: 'Ken',
        email: 'ken@example.com',
      };
      setLastSyncedTimestamp(TEST_TIMESTAMP);
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=${encodeURIComponent(JSON.stringify(mockUser))}; Path=/`;
      const data = clientLoader();
      expect(data).toEqual({ user: mockUser, lastSyncTimestamp: TEST_TIMESTAMP });
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    });
  });

  describe('clientAction', () => {
    it('invokes logout and returns result', async () => {
      vi.mocked(logout).mockResolvedValue({ data: { success: true } });

      const result = await clientAction(mockActionArgs<typeof clientAction>({}));

      expect(logout).toHaveBeenCalled();
      expect(result).toEqual({ data: { success: true } });
    });
  });

  describe('HydrateFallback', () => {
    it('renders HydrateFallback with loading spinner', () => {
      render(<HydrateFallback {...({} as unknown as Route.HydrateFallbackProps)} />);
      expect(screen.getByLabelText('Loading profile')).toBeInTheDocument();
    });
  });

  describe('Page', () => {
    it('renders logged out state when user is null', () => {
      renderRoute({ user: null, lastSyncTimestamp: null });

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

    it('renders logged in state with multi-word name, formatted sync time, and allows clicking sign out', async () => {
      const user = userEvent.setup();
      renderRoute({
        user: { name: 'Alice Smith', email: 'alice@example.com' },
        lastSyncTimestamp: TEST_TIMESTAMP,
      });

      expect(screen.getByRole('link', { name: /home/i })).toHaveAttribute('href', '/');
      expect(screen.getByRole('heading', { level: 1, name: 'Alice Smith' })).toBeInTheDocument();
      expect(screen.getByText('AS')).toBeInTheDocument();

      const expectedDateStr = format(new Date(TEST_TIMESTAMP), 'MMM do, yyyy HH:mm:ss');
      expect(screen.getByText(`Last sync: ${expectedDateStr}`)).toBeInTheDocument();

      const signOutBtn = screen.getByRole('button', { name: /sign out/i });
      expect(signOutBtn).toBeInTheDocument();
      await user.click(signOutBtn);
    });

    it('renders logged in state with single-word name and Never when timestamp is null', () => {
      renderRoute({ user: { name: 'Ken', email: 'ken@example.com' }, lastSyncTimestamp: null });

      expect(screen.getByRole('heading', { level: 1, name: 'Ken' })).toBeInTheDocument();
      expect(screen.getByText('K')).toBeInTheDocument();
      expect(screen.getByText('Last sync: Never')).toBeInTheDocument();
    });

    it('renders logged in state with empty name falling back to default user icon', () => {
      renderRoute({ user: { name: '   ', email: 'empty@example.com' }, lastSyncTimestamp: null });

      expect(screen.getByText(/last sync: never/i)).toBeInTheDocument();
    });

    it('renders non-field error alert when actionData contains nonFieldError', () => {
      mockActionData = { nonFieldError: 'Unable to sign out at this time' };
      renderRoute({ user: { name: 'Alice', email: 'alice@example.com' }, lastSyncTimestamp: null });

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Unable to sign out at this time');
    });

    it('renders submitting loader state when form is submitting', () => {
      mockNavigationState = 'submitting';
      renderRoute({ user: { name: 'Alice', email: 'alice@example.com' }, lastSyncTimestamp: null });

      const signOutBtn = screen.getByRole('button');
      expect(signOutBtn).toBeDisabled();
      expect(screen.getByLabelText('Signing out...')).toBeInTheDocument();
    });
  });

  describe('getInitials', () => {
    it('computes initials correctly in getInitials helper', () => {
      expect(getInitials('')).toBe('');
      expect(getInitials('   ')).toBe('');
      expect(getInitials('Alice')).toBe('A');
      expect(getInitials('Alice Smith')).toBe('AS');
      expect(getInitials('Alice Bob Smith')).toBe('AS');
    });
  });
});
