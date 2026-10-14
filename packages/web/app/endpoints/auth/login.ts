import type { User } from '@kana/helpers/auth/schemas';
import type { ServerResponse } from '@kana/helpers/types';
import { VITE_BACKEND_URL } from '~/helpers/config';
import { endpoint } from '~/helpers/endpoint';

export type LoginProps = {
  formData: FormData;
};

export type LoginResponse = ServerResponse<User>;

export const login = endpoint<LoginProps, LoginResponse>(async ({ f, props }) => {
  const url = `${VITE_BACKEND_URL}/auth/login`;

  return f(url, {
    method: 'POST',
    body: props.formData,
    mode: 'cors',
    credentials: 'include',
  });
});
