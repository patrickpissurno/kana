import { afterAll, describe, expect, it } from 'vitest';
import { makeTestUser } from '~/mocks/factories/user.mock';
import { db } from '../db.server';
import { login } from './login.server';
import { register } from './register.server';

const emailsToCleanup = new Set<string>();

describe('login.server (db)', () => {
  const user = makeTestUser();
  emailsToCleanup.add(user.email);

  afterAll(async () => {
    await db`DELETE FROM users WHERE email IN (${[...emailsToCleanup]})`;
  });

  it('verifies credentials against real database and refreshes session via token', async () => {
    let deviceId: string | undefined = undefined;
    {
      const result = await register(user);
      expect(result.data?.user.email).toBe(user.email);
      expect(result.data?.device_id).toBeDefined();
      deviceId = result.data?.device_id;
    }

    let refreshToken: string | undefined = undefined;
    {
      const result = await login({
        data: {
          email: user.email,
          password: user.password,
        },
        refreshToken: undefined,
        deviceId,
      });

      expect(result.data?.user.email).toBe(user.email);
      expect(result.data?.user.name).toBe(user.name);
      expect(result.data?.device_id).toBe(deviceId);
      expect(result.data?.token).toBeDefined();
      refreshToken = result.data?.token;
    }

    {
      const result = await login({ data: {}, refreshToken });
      expect(result.data?.user.email).toBe(user.email);
      expect(result.data?.user.name).toBe(user.name);
      expect(result.data?.device_id).toBe(deviceId);
      expect(result.data?.token).toBeDefined();
      expect(result.data?.token).not.toBe(refreshToken);
    }
  });
});
