import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { register } from '~/endpoints/auth/register';
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
let mockIsSubmitting = false;

vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>();
  return {
    ...actual,
    useActionData: () => mockActionData,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('@rvf/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@rvf/react-router')>();
  return {
    ...actual,
    useForm: (opts: Parameters<typeof actual.useForm>[0]) => {
      const form = actual.useForm(opts);
      return {
        ...form,
        formState: {
          ...form.formState,
          isSubmitting: mockIsSubmitting,
        },
      };
    },
  };
});

vi.mock('~/endpoints/auth/register', () => ({
  register: vi.fn(),
}));

describe('Create Account Route', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    mockActionData = null;
    mockIsSubmitting = false;
    mockNavigate.mockReset();
  });

  describe('meta', () => {
    it('returns expected meta tags', () => {
      const tags = meta({} as unknown as Route.MetaArgs);
      expect(tags).toHaveLength(EXPECTED_META_COUNT);
      expect(tags[0]).toEqual({ title: 'Create account - Kana' });
    });
  });

  describe('clientAction', () => {
    it('invokes register with request form data and returns result', async () => {
      const formData = new FormData();
      formData.set('name', 'Alice');
      formData.set('email', 'alice@example.com');
      formData.set('password', 'Secret1!');

      vi.mocked(register).mockResolvedValue({ data: MOCK_USER });

      const request = new Request('http://localhost:3000/create-account', {
        method: 'POST',
        body: formData,
      });

      const result = await clientAction(mockActionArgs<typeof clientAction>({ request }));

      expect(register).toHaveBeenCalledWith({ formData });
      expect(result).toEqual({ data: MOCK_USER });
    });
  });

  describe('Component', () => {
    function renderRoute() {
      const router = createMemoryRouter(
        [
          {
            path: '/create-account',
            element: <Page {...({} as unknown as Route.ComponentProps)} />,
          },
        ],
        { initialEntries: ['/create-account'] }
      );
      return render(<RouterProvider router={router} />);
    }

    it('renders initial form with inputs and create account button when no device_id exists', () => {
      renderRoute();

      const backLink = screen.getByRole('link', { name: /back/i });
      expect(backLink).toBeInTheDocument();
      expect(backLink).toHaveAttribute('href', '/profile');

      expect(screen.getByRole('heading', { level: 1, name: 'Create account' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Email' })).toBeInTheDocument();
      expect(screen.getByLabelText('Password')).toBeInTheDocument();

      const hiddenInput = document.querySelector('input[name="device_id"]');
      expect(hiddenInput).toBeDisabled();

      const submitButton = screen.getByRole('button', { name: 'Create account' });
      expect(submitButton).toBeInTheDocument();
      expect(submitButton).not.toBeDisabled();
    });

    it('renders hidden device_id input when device_id exists in storage', () => {
      localStorage.setItem('kana_device_id', '018f0000-0000-7000-8000-000000000001');
      renderRoute();

      const hiddenInput = document.querySelector('input[name="device_id"]');
      expect(hiddenInput).toHaveValue('018f0000-0000-7000-8000-000000000001');
      expect(hiddenInput).not.toBeDisabled();
    });

    it('renders non-field error alert when actionData contains nonFieldError', () => {
      mockActionData = { nonFieldError: 'An unknown error occured' };
      renderRoute();

      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent('An unknown error occured');
    });

    it('navigates to /profile with replace upon success actionData', () => {
      mockActionData = { data: MOCK_USER };
      mockNavigate.mockReturnValue(undefined);

      renderRoute();

      expect(mockNavigate).toHaveBeenCalledWith('/profile', { replace: true });
    });

    it('handles rejecting navigate promise gracefully', async () => {
      mockActionData = { data: MOCK_USER };
      const rejectingPromise = Promise.reject(new Error('Navigation cancelled'));
      rejectingPromise.catch(() => undefined);
      mockNavigate.mockReturnValue(rejectingPromise);

      renderRoute();

      expect(mockNavigate).toHaveBeenCalledWith('/profile', { replace: true });

      await expect(rejectingPromise).rejects.toThrow('Navigation cancelled');
    });

    it('renders submitting loader state when form is submitting', () => {
      mockIsSubmitting = true;
      renderRoute();

      const submitButton = screen.getByRole('button');
      expect(submitButton).toBeDisabled();
      expect(screen.getByLabelText('Creating account...')).toBeInTheDocument();
    });

    it('displays client validation errors when submitting an empty form', async () => {
      const user = userEvent.setup();
      renderRoute();

      const submitButton = screen.getByRole('button', { name: 'Create account' });
      await user.click(submitButton);

      expect(await screen.findByText('Please enter a name or nickname')).toBeInTheDocument();
      expect(screen.getByText('Please enter a valid email address')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Password must be at least 8 characters with lowercase, uppercase, number, and special character'
        )
      ).toBeInTheDocument();
    });
  });
});
