import { safeFetch } from '@kana/helpers/utils/safe-fetch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VITE_BACKEND_URL } from '~/helpers/config';
import { logout } from './logout';

vi.mock('@kana/helpers/utils/safe-fetch', () => ({
  safeFetch: vi.fn(),
}));

describe('logout endpoint', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts to /auth/logout with expected parameters', async () => {
    vi.mocked(safeFetch).mockResolvedValue({
      status: 200,
      statusText: 'OK',
      headers: new Headers(),
      result: { data: { success: true } },
      error: undefined,
    });

    const result = await logout();

    expect(result).toEqual({ data: { success: true } });
    expect(safeFetch).toHaveBeenCalledWith(
      `${VITE_BACKEND_URL}/auth/logout`,
      expect.objectContaining({
        method: 'POST',
        mode: 'cors',
        credentials: 'include',
      })
    );
  });
});
