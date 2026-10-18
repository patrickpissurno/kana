import type { User } from '@kana/helpers/auth/schemas';
import type { ServerResponse } from '@kana/helpers/types';
import { VITE_BACKEND_URL } from '~/helpers/config';
import { endpoint } from '~/helpers/endpoint';
import { getDeviceId, setDeviceId } from '~/helpers/sync-storage';

export type LoginProps = {
  formData: FormData;
};

export type LoginResponse = ServerResponse<User>;

export const login = endpoint<LoginProps, LoginResponse>(async ({ f, props }) => {
  const url = `${VITE_BACKEND_URL}/auth/login`;

  const deviceId = getDeviceId();
  const formDeviceId = props.formData.get('device_id');
  if (typeof formDeviceId === 'string' && formDeviceId.trim() === '') {
    props.formData.delete('device_id');
  }
  if (deviceId && !props.formData.has('device_id')) {
    props.formData.set('device_id', deviceId);
  }

  const res = await f(url, {
    method: 'POST',
    body: props.formData,
    mode: 'cors',
    credentials: 'include',
  });

  if (res.data?.device_id) {
    setDeviceId(res.data.device_id);
  }

  return res;
});
