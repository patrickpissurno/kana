import type { User } from '@kana/helpers/auth/schemas';
import { describe, expect, it } from 'vitest';
import { makeBunRequest } from '~/mocks/bun/bun-request.mock';
import type { SessionCookieData } from './cookie.server';
import {
  SESSION_COOKIE_DOMAIN,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  VITE_SESSION_COOKIE_DATA_NAME,
} from '../config.server';
import {
  attachSessionCookie,
  createExpiredSessionCookie,
  createSessionCookie,
  deleteSessionCookie,
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
    it('clears cookies on req and appends expired Set-Cookie headers on response', () => {
      const req = makeBunRequest('http://localhost:3001/auth/logout');
      req.cookies.set(SESSION_COOKIE_NAME, 'active-token');
      req.cookies.set(VITE_SESSION_COOKIE_DATA_NAME, JSON.stringify(MOCK_USER));
      const res = Response.json({ data: { success: true } });

      const updatedResponse = deleteSessionCookie(req, res);

      expect(req.cookies.get(SESSION_COOKIE_NAME)).toBeNull();
      expect(req.cookies.get(VITE_SESSION_COOKIE_DATA_NAME)).toBeNull();

      const setCookie = updatedResponse.headers.get('Set-Cookie');
      expect(setCookie).toContain(`${SESSION_COOKIE_NAME}=`);
      expect(setCookie).toContain('Max-Age=0');
      expect(setCookie).toContain(`${VITE_SESSION_COOKIE_DATA_NAME}=`);
    });
  });
});
