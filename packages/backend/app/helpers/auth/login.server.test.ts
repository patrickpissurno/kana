import { password } from 'bun';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserWithPasswordRecord } from './login.server';
import { db } from '../db.server';
import { createToken } from './create-token.server';
import { INVALID_CREDENTIALS_ERROR, login } from './login.server';

const ONE_SECOND_IN_MS = 1000;

vi.mock('../db.server', () => ({
  db: vi.fn(),
}));

const mockDb = vi.mocked(db);

function mockDbResult<T>(result: T[]) {
  return Object.assign(result, { value: [], columns: [] });
}

const defaultMockDbImpl = mockDb.getMockImplementation()!;

beforeEach(() => {
  vi.clearAllMocks();
  mockDb.mockReset().mockImplementation(defaultMockDbImpl);
});

describe('login.server', () => {
  const psw = 'Password1!';

  const user: UserWithPasswordRecord = {
    id: 1,
    email: 'test@example.com',
    name: 'Test User',
    password_hash: password.hashSync(psw),
  };

  const testDeviceId = '018f0000-0000-7000-8000-000000000001';

  describe('credentials login', () => {
    it('successfully logs in with valid email and password and generates device_id if none provided', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([user])).mockResolvedValueOnce(mockDbResult([]));

      const result = await login({
        data: {
          email: user.email,
          password: psw,
        },
        refreshToken: undefined,
      });

      expect(result.data?.user.email).toBe(user.email);
      expect(result.data?.user.name).toBe(user.name);
      expect(result.data?.device_id).toBeDefined();
      expect(result.data?.token).toBeDefined();
      expect(result.data?.expires_at).toBeDefined();
    });

    it('successfully logs in with explicitly passed deviceId', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([user])).mockResolvedValueOnce(mockDbResult([]));

      const result = await login({
        data: {
          email: user.email,
          password: psw,
        },
        refreshToken: undefined,
        deviceId: testDeviceId,
      });

      expect(result.data?.device_id).toBe(testDeviceId);
    });

    it('successfully logs in with device_id in payload data', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([user])).mockResolvedValueOnce(mockDbResult([]));

      const result = await login({
        data: {
          email: user.email,
          password: psw,
          device_id: testDeviceId,
        },
        refreshToken: undefined,
      });

      expect(result.data?.device_id).toBe(testDeviceId);
    });

    it('returns INVALID_CREDENTIALS_ERROR when user is not found in database', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([])).mockResolvedValueOnce(mockDbResult([]));

      const result = await login({
        data: {
          email: user.email,
          password: psw,
        },
        refreshToken: undefined,
      });

      expect(result.nonFieldError).toBe(INVALID_CREDENTIALS_ERROR);
      expect(result.data).toBeUndefined();
    });

    it('returns INVALID_CREDENTIALS_ERROR when password does not match', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([user])).mockResolvedValueOnce(mockDbResult([]));

      const result = await login({
        data: {
          email: user.email,
          password: `${psw}abc`,
        },
        refreshToken: undefined,
      });

      expect(result.nonFieldError).toBe(INVALID_CREDENTIALS_ERROR);
      expect(result.data).toBeUndefined();
    });
  });

  describe('session refresh login', () => {
    it('successfully refreshes session with valid token inheriting token device_id', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([user])).mockResolvedValueOnce(mockDbResult([]));

      const refreshToken = await createToken({
        user_id: user.id,
        device_id: testDeviceId,
        expires_at: new Date(Date.now() + ONE_SECOND_IN_MS).toISOString(),
      });

      const result = await login({ data: {}, refreshToken });
      expect(result.data?.user.email).toBe(user.email);
      expect(result.data?.user.name).toBe(user.name);
      expect(result.data?.device_id).toBe(testDeviceId);
      expect(result.data?.token).toBeDefined();
      expect(result.data?.token).not.toBe(refreshToken);
    });

    it('successfully refreshes session with explicit deviceId overriding token device_id', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([user])).mockResolvedValueOnce(mockDbResult([]));

      const customDeviceId = '018f0000-0000-7000-8000-000000000002';
      const refreshToken = await createToken({
        user_id: user.id,
        device_id: testDeviceId,
        expires_at: new Date(Date.now() + ONE_SECOND_IN_MS).toISOString(),
      });

      const result = await login({ data: {}, refreshToken, deviceId: customDeviceId });
      expect(result.data?.device_id).toBe(customDeviceId);
    });

    it('returns INVALID_CREDENTIALS_ERROR when existing token is not provided', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([user])).mockResolvedValueOnce(mockDbResult([]));

      const result = await login({
        data: {},
        refreshToken: undefined,
      });

      expect(result.nonFieldError).toBe(INVALID_CREDENTIALS_ERROR);
      expect(result.data).toBeUndefined();
    });

    it('returns INVALID_CREDENTIALS_ERROR when existing token is expired', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([user])).mockResolvedValueOnce(mockDbResult([]));

      const refreshToken = await createToken({
        user_id: user.id,
        device_id: testDeviceId,
        expires_at: new Date().toISOString(),
      });

      const result = await login({
        data: {},
        refreshToken,
      });

      expect(result.nonFieldError).toBe(INVALID_CREDENTIALS_ERROR);
      expect(result.data).toBeUndefined();
    });

    it('returns INVALID_CREDENTIALS_ERROR when existing token user is not found', async () => {
      mockDb.mockResolvedValueOnce(mockDbResult([])).mockResolvedValueOnce(mockDbResult([]));

      const refreshToken = await createToken({
        user_id: user.id,
        device_id: testDeviceId,
        expires_at: new Date(Date.now() + ONE_SECOND_IN_MS).toISOString(),
      });

      const result = await login({
        data: {},
        refreshToken,
      });

      expect(result.nonFieldError).toBe(INVALID_CREDENTIALS_ERROR);
      expect(result.data).toBeUndefined();
    });
  });
});
