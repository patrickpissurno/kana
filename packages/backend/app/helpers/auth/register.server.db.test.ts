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
    expect(result.data?.device_id).toBeDefined();
    expect(result.data?.token).toBeDefined();
    expect(result.data?.expires_at).toBeDefined();

    const rows = await db<{ id: number; password_hash: string }[]>`
      SELECT id, password_hash FROM users WHERE email = ${user.email}
    `;
    const userRow = rows[0];
    expect(userRow).toBeDefined();
    const isPasswordValid = await password.verify(user.password, userRow?.password_hash ?? '');
    expect(isPasswordValid).toBe(true);

    const counterRows = await db<{ last_event_id: number }[]>`
      SELECT last_event_id FROM quiz_events_counters WHERE user_id = ${userRow?.id}
    `;
    expect(counterRows[0]?.last_event_id).toBe(0);

    const duplicateResult = await register(user);
    expect(duplicateResult.data).toBeUndefined();
    expect(duplicateResult.fieldErrors?.['email']).toBe('This email is already registered');
  });
});
