import { randomUUIDv7 } from 'bun';
import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import type { AuthResult } from '~/helpers/auth/register.server';
import {
  attachDeviceIdCookie,
  attachSessionCookie,
  deleteSessionCookie,
} from '~/helpers/auth/cookie.server';
import { login } from '~/helpers/auth/login.server';
import { register } from '~/helpers/auth/register.server';
import { CORS_VALID_ORIGINS } from '~/helpers/config.server';
import { HTTP_BAD_REQUEST, HTTP_CREATED, HTTP_OK } from '~/helpers/http-status.server';
import { makeBunRequest } from '~/mocks/bun/bun-request.mock';
import { authRoutes } from './route.server';

const ORIGIN = CORS_VALID_ORIGINS.at(0)!;

vi.mock('~/helpers/auth/register.server', () => ({ register: vi.fn() }));
vi.mock('~/helpers/auth/login.server', () => ({ login: vi.fn() }));
vi.mock('~/helpers/auth/cookie.server', { spy: true });

const mockRegister = vi.mocked(register);
const mockLogin = vi.mocked(login);
const mockAttachSessionCookie = vi.mocked(attachSessionCookie);
const mockAttachDeviceIdCookie = vi.mocked(attachDeviceIdCookie);
const mockDeleteSessionCookie = vi.mocked(deleteSessionCookie);

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
        fieldErrors: {
          email: 'Please enter a valid email address',
          name: 'Please enter a name or nickname',
          password:
            'Password must be at least 8 characters with lowercase, uppercase, number, and special character',
        },
      });
    });

    it('it forwards register() errors on failure', async () => {
      const result = {
        fieldErrors: { email: 'Already registered' },
        nonFieldError: 'Custom error',
      } satisfies AuthResult;

      mockRegister.mockImplementation(async () => Promise.resolve(result));

      const req = makeBunRequest('http://localhost/auth/register', {
        method: 'POST',
        body: validForm,
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_BAD_REQUEST);
      expect(await res.json()).toMatchObject(result);
    });

    test('happy path works', async () => {
      const deviceId = randomUUIDv7();
      const result = {
        data: {
          user: { email: 'test@example.com', name: 'Test' },
          device_id: deviceId,
          token: 'token',
          expires_at: new Date().toISOString(),
        },
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
        data: {
          email: result.data.user.email,
          name: result.data.user.name,
          expires_at: result.data.expires_at,
          device_id: deviceId,
        },
      });
      expect(mockAttachSessionCookie).toHaveBeenCalledOnce();
      expect(mockAttachSessionCookie).toHaveBeenCalledWith(req, res, {
        token: result.data.token,
        user: {
          email: result.data.user.email,
          name: result.data.user.name,
          expires_at: result.data.expires_at,
          device_id: deviceId,
        },
      });
      expect(mockAttachDeviceIdCookie).toHaveBeenCalledOnce();
      expect(mockAttachDeviceIdCookie).toHaveBeenCalledWith(req, res, deviceId);
    });

    test('passes existing device id from cookie or form to register', async () => {
      const customDeviceId = randomUUIDv7();
      const formWithDevice = new FormData();
      formWithDevice.append('email', 'test@example.com');
      formWithDevice.append('name', 'Test');
      formWithDevice.append('password', 'Password1!');
      formWithDevice.append('device_id', customDeviceId);

      mockRegister.mockImplementation(async (_data, devId) =>
        Promise.resolve({
          data: {
            user: { email: 'test@example.com', name: 'Test' },
            device_id: devId ?? customDeviceId,
            token: 'token',
            expires_at: new Date().toISOString(),
          },
        })
      );

      const req = makeBunRequest('http://localhost/auth/register', {
        method: 'POST',
        body: formWithDevice,
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);
      expect(res.status).toBe(HTTP_CREATED);
      expect(mockRegister).toHaveBeenCalledWith(expect.anything(), customDeviceId);
    });
  });

  describe('POST /auth/login', () => {
    const { POST } = authRoutes['/auth/login'];

    const validForm = new FormData();
    validForm.append('email', 'test@example.com');
    validForm.append('password', 'Password1!');

    test('validation works and returns errors on failure', async () => {
      const invalidForm = new FormData();
      invalidForm.append('email', 'invalid-email');
      invalidForm.append('password', 'Password1!');

      const req = makeBunRequest('http://localhost/auth/login', {
        method: 'POST',
        body: invalidForm,
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_BAD_REQUEST);
      expect(await res.json()).toMatchObject({
        fieldErrors: {
          email: 'Please enter a valid email address',
        },
      });
    });

    it('it forwards login() errors on failure', async () => {
      const result = {
        nonFieldError: 'Invalid email or password',
      } satisfies AuthResult;

      mockLogin.mockImplementation(async () => Promise.resolve(result));

      const req = makeBunRequest('http://localhost/auth/login', {
        method: 'POST',
        body: validForm,
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_BAD_REQUEST);
      expect(await res.json()).toMatchObject(result);
    });

    test('happy path works', async () => {
      const deviceId = randomUUIDv7();
      const result = {
        data: {
          user: { email: 'test@example.com', name: 'Test' },
          device_id: deviceId,
          token: 'token',
          expires_at: new Date().toISOString(),
        },
      } satisfies AuthResult;

      mockLogin.mockImplementation(async () => Promise.resolve(result));

      const req = makeBunRequest('http://localhost/auth/login', {
        method: 'POST',
        body: validForm,
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_CREATED);
      expect(await res.json()).toMatchObject({
        data: {
          email: result.data.user.email,
          name: result.data.user.name,
          expires_at: result.data.expires_at,
          device_id: deviceId,
        },
      });
      expect(mockAttachSessionCookie).toHaveBeenCalledOnce();
      expect(mockAttachSessionCookie).toHaveBeenCalledWith(req, res, {
        token: result.data.token,
        user: {
          email: result.data.user.email,
          name: result.data.user.name,
          expires_at: result.data.expires_at,
          device_id: deviceId,
        },
      });
      expect(mockAttachDeviceIdCookie).toHaveBeenCalledOnce();
      expect(mockAttachDeviceIdCookie).toHaveBeenCalledWith(req, res, deviceId);
    });

    test('passes existing device id from form to login', async () => {
      const customDeviceId = randomUUIDv7();
      const formWithDevice = new FormData();
      formWithDevice.append('email', 'test@example.com');
      formWithDevice.append('password', 'Password1!');
      formWithDevice.append('device_id', customDeviceId);

      mockLogin.mockImplementation(async ({ deviceId }) =>
        Promise.resolve({
          data: {
            user: { email: 'test@example.com', name: 'Test' },
            device_id: deviceId ?? customDeviceId,
            token: 'token',
            expires_at: new Date().toISOString(),
          },
        })
      );

      const req = makeBunRequest('http://localhost/auth/login', {
        method: 'POST',
        body: formWithDevice,
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);
      expect(res.status).toBe(HTTP_CREATED);
    });
  });

  describe('POST /auth/logout', () => {
    const { POST } = authRoutes['/auth/logout'];

    test('happy path works and clears session cookies', async () => {
      const req = makeBunRequest('http://localhost/auth/logout', {
        method: 'POST',
      });
      req.headers.append('Origin', ORIGIN);

      const res = await POST(req);

      expect(res.status).toBe(HTTP_OK);
      expect(await res.json()).toMatchObject({
        data: { success: true },
      });
      expect(mockDeleteSessionCookie).toHaveBeenCalledOnce();
      expect(mockDeleteSessionCookie).toHaveBeenCalledWith(req, res);
    });
  });
});
