import type { ServerResponse } from '@kana/helpers/types';
import { VITE_BACKEND_URL } from '~/helpers/config';
import { endpoint } from '~/helpers/endpoint';

export type LogoutResponse = ServerResponse<{ success: boolean }>;

export const logout = endpoint<void, LogoutResponse>(async ({ f }) => {
  const url = `${VITE_BACKEND_URL}/auth/logout`;

  return f(url, {
    method: 'POST',
    mode: 'cors',
    credentials: 'include',
  });
});
