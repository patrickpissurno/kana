import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { UserRecord } from './register.server';
import { db } from '../db.server';
import { register } from './register.server';

const PG_ERR_UNIQUE_VIOLATION = '23505';
const TEST_USER: UserRecord = {
  id: '123e4567-e89b-12d3-a456-426614174000',
  email: 'test@example.com',
  name: 'Test User',
};
const TEST_PASSWORD = 'Password1!';

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

describe('register.server', () => {
  it('successfully registers a user and returns token and user data', async () => {
    mockDb.mockResolvedValueOnce(mockDbResult([TEST_USER]));

    const result = await register({
      email: TEST_USER.email,
      name: TEST_USER.name,
      password: TEST_PASSWORD,
    });

    expect(result.data?.user.id).toBe(TEST_USER.id);
    expect(result.data?.user.email).toBe(TEST_USER.email);
    expect(result.data?.user.name).toBe(TEST_USER.name);
    expect(result.data?.token).toBeDefined();
    expect(result.data?.expires_at).toBeDefined();
    expect(result.fieldErrors).toBeUndefined();
    expect(result.nonFieldError).toBeUndefined();
  });

  it('handles empty database return by catching error and returning unknown error', async () => {
    mockDb.mockResolvedValueOnce(mockDbResult([]));

    const result = await register({
      email: TEST_USER.email,
      name: TEST_USER.name,
      password: TEST_PASSWORD,
    });

    expect(result.data).toBeUndefined();
    expect(result.nonFieldError).toBe('An unknown error occured');
  });

  it('returns field error when unique constraint is violated via error code', async () => {
    mockDb.mockRejectedValueOnce({ code: PG_ERR_UNIQUE_VIOLATION });

    const result = await register({
      email: TEST_USER.email,
      name: TEST_USER.name,
      password: TEST_PASSWORD,
    });

    expect(result.data).toBeUndefined();
    expect(result.fieldErrors?.['email']).toBe('This email is already registered');
  });

  it('returns field error when unique constraint is violated via errno', async () => {
    mockDb.mockRejectedValueOnce({ errno: PG_ERR_UNIQUE_VIOLATION });

    const result = await register({
      email: TEST_USER.email,
      name: TEST_USER.name,
      password: TEST_PASSWORD,
    });

    expect(result.data).toBeUndefined();
    expect(result.fieldErrors?.['email']).toBe('This email is already registered');
  });

  it('returns unknown error when caught error is not an object', async () => {
    mockDb.mockRejectedValueOnce('raw string error');

    const result = await register({
      email: TEST_USER.email,
      name: TEST_USER.name,
      password: TEST_PASSWORD,
    });

    expect(result.data).toBeUndefined();
    expect(result.nonFieldError).toBe('An unknown error occured');
  });

  it('returns unknown error when caught error is null', async () => {
    mockDb.mockRejectedValueOnce(null);

    const result = await register({
      email: TEST_USER.email,
      name: TEST_USER.name,
      password: TEST_PASSWORD,
    });

    expect(result.data).toBeUndefined();
    expect(result.nonFieldError).toBe('An unknown error occured');
  });

  it('returns unknown error when caught error is an object without matching code or errno', async () => {
    mockDb.mockRejectedValueOnce({ message: 'connection reset' });

    const result = await register({
      email: TEST_USER.email,
      name: TEST_USER.name,
      password: TEST_PASSWORD,
    });

    expect(result.data).toBeUndefined();
    expect(result.nonFieldError).toBe('An unknown error occured');
  });
});
