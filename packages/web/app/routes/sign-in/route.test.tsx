import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Route } from './+types/route';
import { mockActionArgs } from '../../mocks/react-router/action';
import Page, { clientAction, meta } from './route';

const EXPECTED_META_COUNT = 2;
const MOCK_USER = {
  name: 'Alice',
  email: 'alice@example.com',
  expires_at: '2026-10-14T00:00:00.000Z',
};

const mockNavigate = vi.fn<() => void | Promise<void>>();
let mockActionData: unknown = null;
let mockNavigationState: 'idle' | 'submitting' | 'loading' = 'idle';

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useActionData: () => mockActionData,
    useNavigate: () => mockNavigate,
    useNavigation: () => ({ state: mockNavigationState }),
  };
});

const mockSetStoredUser = vi.fn();
vi.mock('../../helpers/user-storage', () => ({
  setStoredUser: (user: unknown) => mockSetStoredUser(user),
}));

describe('Sign In Route', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockActionData = null;
    mockNavigationState = 'idle';
    mockNavigate.mockReset();
    mockSetStoredUser.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('meta', () => {
    it('returns expected meta tags', () => {
      const tags = meta({} as unknown as Route.MetaArgs);
      expect(tags).toHaveLength(EXPECTED_META_COUNT);
      expect(tags[0]).toEqual({ title: 'Sign in - Kana' });
    });
  });

  describe('clientAction', () => {
    it('successfully proxies credentials and returns user data on success', async () => {
      vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:3001');

      const formData = new FormData();
      formData.set('email', 'alice@example.com');
      formData.set('password', 'secret');

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify(MOCK_USER), { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('http://localhost:3000/sign-in', {
        method: 'POST',
        body: formData,
      });

      const result = await clientAction(mockActionArgs<typeof clientAction>({ request }));

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3001/auth/login',
        expect.objectContaining({
          method: 'POST',
          mode: 'cors',
          credentials: 'include',
        })
      );
      expect(result).toEqual({ success: true, user: MOCK_USER });
    });

    it('falls back to empty string when VITE_BACKEND_URL is not set', async () => {
      delete process.env['VITE_BACKEND_URL'];

      const formData = new FormData();
      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify(MOCK_USER), { status: 200 }));
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('http://localhost:3000/sign-in', {
        method: 'POST',
        body: formData,
      });

      const result = await clientAction(mockActionArgs<typeof clientAction>({ request }));

      expect(mockFetch).toHaveBeenCalledWith('/auth/login', expect.any(Object));
      expect(result).toEqual({ success: true, user: MOCK_USER });
    });

    it('returns validationError when backend responds with field errors', async () => {
      vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:3001');

      const fieldErrors = { email: 'Please enter a valid email address' };
      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(
          new Response(JSON.stringify({ error: { fieldErrors } }), { status: 400 })
        );
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('http://localhost:3000/sign-in', {
        method: 'POST',
        body: new FormData(),
      });

      const result = (await clientAction(
        mockActionArgs<typeof clientAction>({ request })
      )) as unknown as { data: { fieldErrors: Record<string, string> } };

      expect(result.data.fieldErrors).toEqual(fieldErrors);
    });

    it('returns nonFieldError when backend responds with non-field error', async () => {
      vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:3001');

      const mockFetch = vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ error: { nonFieldError: 'Invalid email or password' } }), {
          status: 400,
        })
      );
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('http://localhost:3000/sign-in', {
        method: 'POST',
        body: new FormData(),
      });

      const result = await clientAction(mockActionArgs<typeof clientAction>({ request }));

      expect(result).toEqual({ nonFieldError: 'Invalid email or password' });
    });

    it('returns fallback nonFieldError when error body is unexpected', async () => {
      vi.stubEnv('VITE_BACKEND_URL', 'http://localhost:3001');

      const mockFetch = vi
        .fn<typeof fetch>()
        .mockResolvedValue(new Response(JSON.stringify({}), { status: 500 }));
      vi.stubGlobal('fetch', mockFetch);

      const request = new Request('http://localhost:3000/sign-in', {
        method: 'POST',
        body: new FormData(),
      });

      const result = await clientAction(mockActionArgs<typeof clientAction>({ request }));

      expect(result).toEqual({ nonFieldError: 'An unexpected error occurred' });
    });
  });

  describe('Component', () => {
    function renderRoute() {
      const router = createMemoryRouter(
        [
          {
            path: '/sign-in',
            element: <Page {...({} as unknown as Route.ComponentProps)} />,
          },
        ],
        { initialEntries: ['/sign-in'] }
      );
      return render(<RouterProvider router={router} />);
    }

    it('renders initial form with inputs and sign in button', () => {
      renderRoute();

      const backLink = screen.getByRole('link', { name: /back/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/profile');

      expect(screen.getByRole('heading', { level: 1, name: 'Sign in' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();

      const submitButton = screen.getByRole('button', { name: 'Sign in' });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });

    it('renders non-field error alert when actionData contains nonFieldError', () => {
      mockActionData = { nonFieldError: 'Invalid email or password' };
      renderRoute();

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('Invalid email or password');
    });

    it('persists user and navigates to /profile with replace upon success actionData', () => {
      mockActionData = { success: true, user: MOCK_USER };
      mockNavigate.mockReturnValue(undefined);

      renderRoute();

      expect(mockSetStoredUser).toHaveBeenCalledWith(MOCK_USER);
      expect(mockNavigate).toHaveBeenCalledWith('/profile', { replace: true });
    });

    it('handles rejecting navigate promise gracefully', async () => {
      mockActionData = { success: true, user: MOCK_USER };
      const rejectingPromise = Promise.reject(new Error('Navigation cancelled'));
      mockNavigate.mockReturnValue(rejectingPromise);

      renderRoute();

      expect(mockSetStoredUser).toHaveBeenCalledWith(MOCK_USER);
      expect(mockNavigate).toHaveBeenCalledWith('/profile', { replace: true });

      await expect(rejectingPromise).rejects.toThrow('Navigation cancelled');
    });

    it('renders submitting loader state when navigation is submitting', () => {
      mockNavigationState = 'submitting';
      renderRoute();

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
      expect(screen.getByLabelText('Signing in...')).toBeInTheDocument();
    });

    it('displays client validation errors when submitting an empty form', async () => {
      const user = userEvent.setup();
      renderRoute();

      const submitButton = screen.getByRole('button', { name: 'Sign in' });
      await user.click(submitButton);

      expect(await screen.findByText('Please enter a valid email address')).toBeInTheDocument();
      expect(screen.getByText('Please enter a password')).toBeInTheDocument();
    });
  });
});
