import { afterAll, describe, expect, it } from 'vitest';
import { makeTestUser } from '~/mocks/factories/user.mock';
import { db } from '../db.server';
import { INVALID_CREDENTIALS_ERROR, login } from './login.server';
import { register } from './register.server';

const emailsToCleanup = new Set<string>();

describe('login.server (db)', () => {
  const user = makeTestUser();
  emailsToCleanup.add(user.email);

  afterAll(async () => {
    await db`DELETE FROM users WHERE email IN (${[...emailsToCleanup]})`;
  });

  it('verifies credentials against real database and refreshes session via token', async () => {
    let userId: string | undefined = undefined;
    {
      const result = await register(user);
      expect(result.data?.user.email).toBe(user.email);
      userId = result.data?.user.id;
    }

    let refreshToken: string | undefined = undefined;
    {
      const result = await login({
        data: {
          email: user.email,
          password: user.password,
        },
        refreshToken: undefined,
      });

      expect(result.data?.user.id).toBe(userId);
      expect(result.data?.user.email).toBe(user.email);
      expect(result.data?.user.name).toBe(user.name);
      expect(result.data?.token).toBeDefined();
      refreshToken = result.data?.token;
    }

    {
      const result = await login({
        data: {
          email: user.email,
          password: `${user.password}abc`,
        },
        refreshToken: undefined,
      });

      expect(result.error?.nonFieldError).toBe(INVALID_CREDENTIALS_ERROR);
    }

    {
      const result = await login({
        data: {
          email: user.email,
          password: `${user.password}abc`,
        },
        refreshToken: undefined,
      });

      expect(result.error?.nonFieldError).toBe(INVALID_CREDENTIALS_ERROR);
    }

    {
      const result = await login({ data: {}, refreshToken });
      expect(result.data?.user.id).toBe(userId);
      expect(result.data?.user.email).toBe(user.email);
      expect(result.data?.token).toBeDefined();
      expect(result.data?.token).not.toBe(refreshToken);
    }
  });
});
