import type { RegisterPayload } from '@kana/helpers/auth/schemas';
import type { ServerResponse } from '@kana/helpers/types';
import { password, randomUUIDv7 } from 'bun';
import { SESSION_TTL_SECONDS } from '../config.server';
import { db } from '../db.server';
import { createToken } from './create-token.server';

const ONE_SECOND_IN_MS = 1000;
const TTL_MS = SESSION_TTL_SECONDS * ONE_SECOND_IN_MS;

const PG_ERR_UNIQUE_VIOLATION = '23505';

export type UserRecord = {
  readonly id: number;
  readonly email: string;
  readonly name: string;
};

export type AuthResult = ServerResponse<{
  readonly user: {
    readonly email: string;
    readonly name: string;
  };
  readonly device_id: string;
  readonly token: string;
  readonly expires_at: string;
}>;

export async function register(data: RegisterPayload, deviceId?: string): Promise<AuthResult> {
  const passwordHash = await password.hash(data.password);

  try {
    const rows = await db<UserRecord[]>`
      INSERT INTO users (email, password_hash, name, last_login_at)
      VALUES (${data.email}, ${passwordHash}, ${data.name}, CURRENT_TIMESTAMP)
      RETURNING id, email, name
    `;

    const user = rows[0];
    if (!user) {
      throw new Error('Failed to insert user');
    }

    await db`
      INSERT INTO quiz_events_counters (user_id, last_event_id)
      VALUES (${user.id}, 0)
    `;

    const resolvedDeviceId = deviceId ?? data.device_id ?? randomUUIDv7();
    const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
    const token = await createToken({
      user_id: user.id,
      device_id: resolvedDeviceId,
      expires_at: expiresAt,
    });

    return {
      data: {
        user: {
          email: user.email,
          name: user.name,
        },
        device_id: resolvedDeviceId,
        token,
        expires_at: expiresAt,
      },
    };
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      (('code' in error && error.code === PG_ERR_UNIQUE_VIOLATION) ||
        ('errno' in error && error.errno === PG_ERR_UNIQUE_VIOLATION))
    ) {
      return { fieldErrors: { email: 'This email is already registered' } };
    }

    return {
      nonFieldError: 'An unknown error occured',
    };
  }
}
