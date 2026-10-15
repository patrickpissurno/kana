import type { User } from '@kana/helpers/auth/schemas';
import { safeFetch } from '@kana/helpers/utils/safe-fetch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VITE_BACKEND_URL } from '~/helpers/config';
import { register } from './register';

vi.mock('@kana/helpers/utils/safe-fetch', () => ({
  safeFetch: vi.fn(),
}));

const MOCK_USER: User = {
  email: 'user@example.com',
  name: 'Kana User',
  expires_at: '2026-10-14T00:00:00.000Z',
};

describe('register endpoint', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts credentials to /auth/register with expected parameters', async () => {
    const formData = new FormData();
    formData.append('name', 'Kana User');
    formData.append('email', 'user@example.com');
    formData.append('password', 'Password1!');

    vi.mocked(safeFetch).mockResolvedValue({
      status: 201,
      statusText: 'Created',
      headers: new Headers(),
      result: { data: MOCK_USER },
      error: undefined,
    });

    const result = await register({ formData });

    expect(result).toEqual({ data: MOCK_USER });
    expect(safeFetch).toHaveBeenCalledWith(
      `${VITE_BACKEND_URL}/auth/register`,
      expect.objectContaining({
        method: 'POST',
        body: formData,
        mode: 'cors',
        credentials: 'include',
      })
    );
  });
});
