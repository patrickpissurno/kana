import type { LoginPayload } from '@kana/helpers/auth/schemas';
import { password, randomUUIDv7 } from 'bun';
import type { AuthResult, UserRecord } from './register.server';
import { SESSION_TTL_SECONDS } from '../config.server';
import { db } from '../db.server';
import { createToken } from './create-token.server';
import { validateToken } from './validate-token.server';

const ONE_SECOND_IN_MS = 1000;
const TTL_MS = SESSION_TTL_SECONDS * ONE_SECOND_IN_MS;

export const INVALID_CREDENTIALS_ERROR = 'Invalid email or password';

export type UserWithPasswordRecord = UserRecord & {
  readonly password_hash: string;
};

export type LoginProps = {
  data: LoginPayload;
  refreshToken: string | undefined;
  deviceId?: string;
};

export async function login({ data, refreshToken, deviceId }: LoginProps): Promise<AuthResult> {
  let user: UserRecord | undefined = undefined;
  let resolvedDeviceId: string | undefined = deviceId ?? data.device_id;

  if (data.email != null) {
    const rows = await db<UserWithPasswordRecord[]>`
      SELECT id, email, name, password_hash
      FROM users
      WHERE email = ${data.email} AND deleted_at IS NULL
    `;
    const foundUser = rows[0];
    if (!foundUser) {
      return {
        nonFieldError: INVALID_CREDENTIALS_ERROR,
      };
    }

    const isMatch = await password.verify(data.password, foundUser.password_hash);
    if (!isMatch) {
      return {
        nonFieldError: INVALID_CREDENTIALS_ERROR,
      };
    }

    user = {
      id: foundUser.id,
      email: foundUser.email,
      name: foundUser.name,
    };
  } else {
    if (!refreshToken) {
      return {
        nonFieldError: INVALID_CREDENTIALS_ERROR,
      };
    }

    const tokenData = await validateToken(refreshToken);
    if (!tokenData) {
      return {
        nonFieldError: INVALID_CREDENTIALS_ERROR,
      };
    }

    const rows = await db<UserRecord[]>`
      SELECT id, email, name
      FROM users
      WHERE id = ${tokenData.user_id} AND deleted_at IS NULL
    `;
    const foundUser = rows[0];
    if (!foundUser) {
      return {
        nonFieldError: INVALID_CREDENTIALS_ERROR,
      };
    }

    resolvedDeviceId ??= tokenData.device_id;
    user = foundUser;
  }

  await db`
    UPDATE users
    SET last_login_at = CURRENT_TIMESTAMP
    WHERE id = ${user.id}
  `;

  resolvedDeviceId ??= randomUUIDv7();
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
}
