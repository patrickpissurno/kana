import type { User } from '@kana/helpers/auth/schemas';
import { safeFetch } from '@kana/helpers/utils/safe-fetch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { VITE_BACKEND_URL } from '~/helpers/config';
import { DEVICE_ID_STORAGE_KEY } from '~/helpers/sync-storage';
import { register } from './register';

vi.mock('@kana/helpers/utils/safe-fetch', () => ({
  safeFetch: vi.fn(),
}));

const TEST_DEVICE_ID = '018f0000-0000-7000-8000-000000000001';
const NEW_DEVICE_ID = '018f0000-0000-7000-8000-000000000002';

const MOCK_USER: User = {
  email: 'user@example.com',
  name: 'Kana User',
  expires_at: '2026-10-14T00:00:00.000Z',
};

describe('register endpoint', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('posts credentials to /auth/register and saves returned device_id', async () => {
    const formData = new FormData();
    formData.append('name', 'Kana User');
    formData.append('email', 'user@example.com');
    formData.append('password', 'Password1!');

    vi.mocked(safeFetch).mockResolvedValue({
      status: 201,
      statusText: 'Created',
      headers: new Headers(),
      result: { data: { ...MOCK_USER, device_id: NEW_DEVICE_ID } },
      error: undefined,
    });

    const result = await register({ formData });

    expect(result).toEqual({ data: { ...MOCK_USER, device_id: NEW_DEVICE_ID } });
    expect(localStorage.getItem(DEVICE_ID_STORAGE_KEY)).toBe(NEW_DEVICE_ID);
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

  it('attaches existing stored device_id when formData does not include it', async () => {
    localStorage.setItem(DEVICE_ID_STORAGE_KEY, TEST_DEVICE_ID);
    const formData = new FormData();
    formData.append('name', 'Kana User');
    formData.append('email', 'user@example.com');

    vi.mocked(safeFetch).mockResolvedValue({
      status: 201,
      statusText: 'Created',
      headers: new Headers(),
      result: { data: MOCK_USER },
      error: undefined,
    });

    await register({ formData });

    expect(formData.get('device_id')).toBe(TEST_DEVICE_ID);
  });

  it('strips empty string device_id from formData before attaching or sending', async () => {
    const formData = new FormData();
    formData.append('device_id', '   ');

    vi.mocked(safeFetch).mockResolvedValue({
      status: 201,
      statusText: 'Created',
      headers: new Headers(),
      result: { data: MOCK_USER },
      error: undefined,
    });

    await register({ formData });

    expect(formData.has('device_id')).toBe(false);
  });
});
