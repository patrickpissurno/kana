import { randomUUIDv7 } from 'bun';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { AuthResult } from '~/helpers/auth/register.server';
import { attachSessionCookie } from '~/helpers/auth/cookie.server';
import { login } from '~/helpers/auth/login.server';
import { register } from '~/helpers/auth/register.server';
import { CORS_VALID_ORIGINS } from '~/helpers/config.server';
import { HTTP_BAD_REQUEST, HTTP_CREATED } from '~/helpers/http-status.server';
import { makeBunRequest } from '~/mocks/bun/bun-request.mock';
import { authRoutes } from './route.server';

const ORIGIN = CORS_VALID_ORIGINS.at(0)!;

vi.mock('~/helpers/auth/register.server', () => ({ register: vi.fn() }));
vi.mock('~/helpers/auth/login.server', () => ({ login: vi.fn() }));
vi.mock('~/helpers/auth/cookie.server', { spy: true });

const mockRegister = vi.mocked(register);
const mockLogin = vi.mocked(login);
const mockAttachSessionCookie = vi.mocked(attachSessionCookie);

const defaultMockRegisterImpl = mockRegister.getMockImplementation()!;
const defaultMockLoginImpl = mockLogin.getMockImplementation()!;

beforeEach(() => {
  vi.clearAllMocks();
  mockRegister.mockReset().mockImplementation(defaultMockRegisterImpl);
  mockLogin.mockReset().mockImplementation(defaultMockLoginImpl);
});

describe('authRoutes', () => {
  describe('POST /auth/register', () => {
    const { POST } = authRoutes['/auth/register'];

    const validForm = new FormData();
    validForm.append('email', 'test@example.com');
    validForm.append('name', 'Test');
    validForm.append('password', 'Password1!');

    test('validation works and returns errors on failure', async () => {
      const req = makeBunRequest('http://localhost/auth/register', {
        method: 'POST',
        body: new FormData(),
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_BAD_REQUEST);
      expect(await res.json()).toMatchObject({
        error: {
          fieldErrors: {
            email: 'Please enter a valid email address',
            name: 'Please enter a name or nickname',
            password:
              'Password must be at least 8 characters with lowercase, uppercase, number, and special character',
          },
        },
      });
    });

    it('it forwards register() errors on failure', async () => {
      const result = {
        data: undefined,
        error: { fieldErrors: { email: 'Already registered' }, nonFieldError: 'Custom error' },
      } satisfies AuthResult;

      mockRegister.mockImplementation(async () => Promise.resolve(result));

      const req = makeBunRequest('http://localhost/auth/register', {
        method: 'POST',
        body: validForm,
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_BAD_REQUEST);
      expect(await res.json()).toMatchObject({ error: result.error });
    });

    test('happy path works', async () => {
      const result = {
        data: {
          user: { id: randomUUIDv7(), email: 'test@example.com', name: 'Test' },
          token: 'token',
          expires_at: new Date().toISOString(),
        },
        error: undefined,
      } satisfies AuthResult;

      mockRegister.mockImplementation(async () => Promise.resolve(result));

      const req = makeBunRequest('http://localhost/auth/register', {
        method: 'POST',
        body: validForm,
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_CREATED);
      expect(await res.json()).toMatchObject({
        email: result.data.user.email,
        name: result.data.user.name,
        expires_at: result.data.expires_at,
      });
      expect(mockAttachSessionCookie).toHaveBeenCalledOnce();
      expect(mockAttachSessionCookie).toHaveBeenCalledWith(req, res, result.data.token);
    });
  });
});
