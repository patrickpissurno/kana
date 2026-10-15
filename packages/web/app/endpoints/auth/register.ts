import type { User } from '@kana/helpers/auth/schemas';
import type { ServerResponse } from '@kana/helpers/types';
import { VITE_BACKEND_URL } from '~/helpers/config';
import { endpoint } from '~/helpers/endpoint';

export type RegisterProps = {
  formData: FormData;
};

export type RegisterResponse = ServerResponse<User>;

export const register = endpoint<RegisterProps, RegisterResponse>(async ({ f, props }) => {
  const url = `${VITE_BACKEND_URL}/auth/register`;

  return f(url, {
    method: 'POST',
    body: props.formData,
    mode: 'cors',
    credentials: 'include',
  });
});
