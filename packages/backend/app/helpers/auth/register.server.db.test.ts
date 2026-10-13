import { password } from 'bun';
import { afterAll, describe, expect, it } from 'vitest';
import { makeTestUser } from '~/mocks/factories/user.mock';
import { db } from '../db.server';
import { register } from './register.server';

const emailsToCleanup = new Set<string>();

describe('register.server (db)', () => {
  const user = makeTestUser();
  emailsToCleanup.add(user.email);

  afterAll(async () => {
    await db`DELETE FROM users WHERE email IN (${[...emailsToCleanup]})`;
  });

  it('inserts user into database, hashes password, and handles unique constraint duplicate error', async () => {
    const result = await register(user);

    expect(result.data?.user.email).toBe(user.email);
    expect(result.data?.user.name).toBe(user.name);
    expect(result.data?.token).toBeDefined();
    expect(result.data?.expires_at).toBeDefined();

    const userId = result.data?.user.id;
    const rows = await db<{ password_hash: string }[]>`
      SELECT password_hash FROM users WHERE id = ${userId}::uuid
    `;
    const passwordHash = rows[0]?.password_hash ?? '';
    const isPasswordValid = await password.verify(user.password, passwordHash);
    expect(isPasswordValid).toBe(true);

    const duplicateResult = await register(user);
    expect(duplicateResult.data).toBeUndefined();
    expect(duplicateResult.error?.fieldErrors?.['email']).toBe('This email is already registered');
  });
});
