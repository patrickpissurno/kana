import type { TokenData } from '@kana/helpers/auth/schemas';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { makeBunRequest } from '~/mocks/bun/bun-request.mock';
import { HTTP_UNAUTHORIZED } from '../http-status.server';
import { getSessionCookie } from './cookie.server';
import { enforceAuthentication } from './enforce-authentication.server';
import { validateToken } from './validate-token.server';

vi.mock('./cookie.server', () => ({
  getSessionCookie: vi.fn(),
}));

vi.mock('./validate-token.server', () => ({
  validateToken: vi.fn(),
}));

const mockGetSessionCookie = vi.mocked(getSessionCookie);
const mockValidateToken = vi.mocked(validateToken);

const VALID_TOKEN_DATA: TokenData = {
  user_id: '123e4567-e89b-12d3-a456-426614174000',
  expires_at: '2026-10-15T00:00:00.000Z',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('enforceAuthentication', () => {
  it('throws 401 Response when session cookie is missing', async () => {
    mockGetSessionCookie.mockReturnValue(undefined);
    const req = makeBunRequest('http://localhost:3001/sync/quiz-events');

    await expect(enforceAuthentication(req)).rejects.toSatisfy((err: unknown) => {
      return err instanceof Response && err.status === HTTP_UNAUTHORIZED;
    });
    expect(mockValidateToken).not.toHaveBeenCalled();
  });

  it('throws 401 Response when token is invalid or expired', async () => {
    mockGetSessionCookie.mockReturnValue('invalid-token');
    mockValidateToken.mockResolvedValue(null);
    const req = makeBunRequest('http://localhost:3001/sync/quiz-events');

    await expect(enforceAuthentication(req)).rejects.toSatisfy((err: unknown) => {
      return err instanceof Response && err.status === HTTP_UNAUTHORIZED;
    });
    expect(mockValidateToken).toHaveBeenCalledWith('invalid-token');
  });

  it('returns token data when token is valid', async () => {
    mockGetSessionCookie.mockReturnValue('valid-token');
    mockValidateToken.mockResolvedValue(VALID_TOKEN_DATA);
    const req = makeBunRequest('http://localhost:3001/sync/quiz-events');

    const result = await enforceAuthentication(req);
    expect(result).toEqual(VALID_TOKEN_DATA);
    expect(mockValidateToken).toHaveBeenCalledWith('valid-token');
  });
});
