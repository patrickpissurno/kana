import type { User } from '@kana/helpers/auth/schemas';
import { describe, expect, it } from 'vitest';
import { makeBunRequest } from '~/mocks/bun/bun-request.mock';
import type { SessionCookieData } from './cookie.server';
import {
  DEVICE_COOKIE_MAX_AGE_SECONDS,
  DEVICE_ID_COOKIE_NAME,
  SESSION_COOKIE_DOMAIN,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  VITE_SESSION_COOKIE_DATA_NAME,
} from '../config.server';
import {
  attachDeviceIdCookie,
  attachSessionCookie,
  createDeviceIdCookie,
  createExpiredSessionCookie,
  createSessionCookie,
  deleteSessionCookie,
  getDeviceIdCookie,
  getSessionCookie,
} from './cookie.server';

const MOCK_USER: User = {
  email: 'test@example.com',
  name: 'Test User',
  expires_at: '2026-10-14T00:00:00.000Z',
};

const VALID_SESSION_DATA: SessionCookieData = {
  token: 'token-123',
  user: MOCK_USER,
};

const TEST_DEVICE_ID = '018f3b1e-7f6a-7000-8000-000000000001';

describe('cookie.server', () => {
  describe('createSessionCookie', () => {
    it('creates session and session data cookies with expected attributes', () => {
      const [sessionCookie, sessionDataCookie] = createSessionCookie(VALID_SESSION_DATA);

      expect(sessionCookie.name).toBe(SESSION_COOKIE_NAME);
      expect(sessionCookie.value).toBe(VALID_SESSION_DATA.token);
      expect(sessionCookie.maxAge).toBe(SESSION_TTL_SECONDS);
      expect(sessionCookie.httpOnly).toBe(true);
      expect(sessionCookie.secure).toBe(true);
      expect(sessionCookie.sameSite).toBe('lax');
      expect(sessionCookie.domain).toBe(SESSION_COOKIE_DOMAIN);

      expect(sessionDataCookie.name).toBe(VITE_SESSION_COOKIE_DATA_NAME);
      expect(sessionDataCookie.value).toBe(JSON.stringify(VALID_SESSION_DATA.user));
      expect(sessionDataCookie.maxAge).toBe(SESSION_TTL_SECONDS);
      expect(sessionDataCookie.httpOnly).toBe(false);
      expect(sessionDataCookie.secure).toBe(true);
      expect(sessionDataCookie.sameSite).toBe('lax');
      expect(sessionDataCookie.domain).toBe(SESSION_COOKIE_DOMAIN);
    });
  });

  describe('getSessionCookie', () => {
    it('retrieves session cookie from req.cookies if present', () => {
      const req = makeBunRequest('http://localhost:3001/auth/login');
      req.cookies.set(SESSION_COOKIE_NAME, 'active-token');

      const session = getSessionCookie(req);
      expect(session).toBe('active-token');
    });

    it('returns undefined when session cookie is not present in header', () => {
      const req = makeBunRequest('http://localhost:3001/auth/login');

      const session = getSessionCookie(req);
      expect(session).toBeUndefined();
    });
  });

  describe('getDeviceIdCookie', () => {
    it('retrieves device id cookie from req.cookies if present', () => {
      const req = makeBunRequest('http://localhost:3001/auth/login');
      req.cookies.set(DEVICE_ID_COOKIE_NAME, TEST_DEVICE_ID);

      const deviceId = getDeviceIdCookie(req);
      expect(deviceId).toBe(TEST_DEVICE_ID);
    });

    it('returns undefined when device id cookie is not present in header', () => {
      const req = makeBunRequest('http://localhost:3001/auth/login');

      const deviceId = getDeviceIdCookie(req);
      expect(deviceId).toBeUndefined();
    });
  });

  describe('createDeviceIdCookie', () => {
    it('creates permanent http-only device cookie with 10-year maxAge', () => {
      const cookie = createDeviceIdCookie(TEST_DEVICE_ID);

      expect(cookie.name).toBe(DEVICE_ID_COOKIE_NAME);
      expect(cookie.value).toBe(TEST_DEVICE_ID);
      expect(cookie.maxAge).toBe(DEVICE_COOKIE_MAX_AGE_SECONDS);
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.secure).toBe(true);
      expect(cookie.sameSite).toBe('lax');
      expect(cookie.domain).toBe(SESSION_COOKIE_DOMAIN);
    });
  });

  describe('attachDeviceIdCookie', () => {
    it('attaches device cookie to req.cookies and response Set-Cookie header', () => {
      const req = makeBunRequest('http://localhost:3001/auth/login');
      const res = Response.json({ ok: true });

      const updatedResponse = attachDeviceIdCookie(req, res, TEST_DEVICE_ID);

      expect(req.cookies.get(DEVICE_ID_COOKIE_NAME)).toBe(TEST_DEVICE_ID);
      const setCookie = updatedResponse.headers.get('Set-Cookie');
      expect(setCookie).toContain(`${DEVICE_ID_COOKIE_NAME}=${TEST_DEVICE_ID}`);
    });
  });

  describe('attachSessionCookie', () => {
    it('attaches both cookies to req.cookies and response headers', () => {
      const req = makeBunRequest('http://localhost:3001/auth/login');
      const res = Response.json({ ok: true });

      const updatedResponse = attachSessionCookie(req, res, VALID_SESSION_DATA);

      expect(req.cookies.get(SESSION_COOKIE_NAME)).toBe(VALID_SESSION_DATA.token);
      expect(req.cookies.get(VITE_SESSION_COOKIE_DATA_NAME)).toBe(
        JSON.stringify(VALID_SESSION_DATA.user)
      );

      const setCookie = updatedResponse.headers.get('Set-Cookie');
      expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=${VALID_SESSION_DATA.token}`);
      expect(setCookie).toContain(
        `${VITE_SESSION_COOKIE_DATA_NAME}=${encodeURIComponent(JSON.stringify(VALID_SESSION_DATA.user))}`
      );
    });
  });

  describe('createExpiredSessionCookie', () => {
    it('creates session and session data cookies with maxAge 0 and empty values', () => {
      const [sessionCookie, sessionDataCookie] = createExpiredSessionCookie();

      expect(sessionCookie.name).toBe(SESSION_COOKIE_NAME);
      expect(sessionCookie.value).toBe('');
      expect(sessionCookie.maxAge).toBe(0);
      expect(sessionCookie.httpOnly).toBe(true);
      expect(sessionCookie.secure).toBe(true);
      expect(sessionCookie.sameSite).toBe('lax');
      expect(sessionCookie.domain).toBe(SESSION_COOKIE_DOMAIN);

      expect(sessionDataCookie.name).toBe(VITE_SESSION_COOKIE_DATA_NAME);
      expect(sessionDataCookie.value).toBe('');
      expect(sessionDataCookie.maxAge).toBe(0);
      expect(sessionDataCookie.httpOnly).toBe(false);
      expect(sessionDataCookie.secure).toBe(true);
      expect(sessionDataCookie.sameSite).toBe('lax');
      expect(sessionDataCookie.domain).toBe(SESSION_COOKIE_DOMAIN);
    });
  });

  describe('deleteSessionCookie', () => {
    it('clears session cookies on req and appends expired Set-Cookie headers on response without touching device id', () => {
      const req = makeBunRequest('http://localhost:3001/auth/logout');
      req.cookies.set(SESSION_COOKIE_NAME, 'active-token');
      req.cookies.set(VITE_SESSION_COOKIE_DATA_NAME, JSON.stringify(MOCK_USER));
      req.cookies.set(DEVICE_ID_COOKIE_NAME, TEST_DEVICE_ID);
      const res = Response.json({ data: { success: true } });

      const updatedResponse = deleteSessionCookie(req, res);

      expect(req.cookies.get(SESSION_COOKIE_NAME)).toBeNull();
      expect(req.cookies.get(VITE_SESSION_COOKIE_DATA_NAME)).toBeNull();
      expect(req.cookies.get(DEVICE_ID_COOKIE_NAME)).toBe(TEST_DEVICE_ID);

      const setCookie = updatedResponse.headers.get('Set-Cookie');
      expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
      expect(setCookie).toContain('Max-Age=0');
      expect(setCookie).toContain(`${VITE_SESSION_COOKIE_DATA_NAME}=`);
      expect(setCookie).not.toContain(`${DEVICE_ID_COOKIE_NAME}=`);
    });
  });
});
