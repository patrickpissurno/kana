import { password } from 'bun';
import type { ServerError } from '../make-error.server';
import type { RegisterPayload } from './schemas.server';
import { SESSION_TTL_SECONDS } from '../config.server';
import { db } from '../db.server';
import { createToken } from './create-token.server';

const ONE_SECOND_IN_MS = 1000;
const TTL_MS = SESSION_TTL_SECONDS * ONE_SECOND_IN_MS;

const PG_ERR_UNIQUE_VIOLATION = '23505';

export type UserRecord = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
};

export type AuthResult =
  | {
      readonly data: {
        readonly user: UserRecord;
        readonly token: string;
        readonly expires_at: string;
      };
      readonly error?: undefined;
    }
  | {
      readonly data?: undefined;
      readonly error: ServerError;
    };

export async function register(data: RegisterPayload): Promise<AuthResult> {
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

    const expiresAt = new Date(Date.now() + TTL_MS).toISOString();
    const token = await createToken({
      user_id: user.id,
      expires_at: expiresAt,
    });

    return {
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
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
      return { error: { fieldErrors: { email: 'This email is already registered' } } };
    }

    return {
      error: { nonFieldError: 'An unknown error occured' },
    };
  }
}
