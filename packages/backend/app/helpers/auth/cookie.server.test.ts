import { describe, expect, it } from 'vitest';
import { makeBunRequest } from '~/mocks/bun/bun-request.mock';
import { SESSION_COOKIE_DOMAIN, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '../config.server';
import { attachSessionCookie, createSessionCookie, getSessionCookie } from './cookie.server';

describe('cookie.server', () => {
  describe('createSessionCookie', () => {
    it('creates a session cookie with default attributes without domain', () => {
      const cookie = createSessionCookie('test-token');
      expect(cookie.name).toBe(SESSION_COOKIE_NAME);
      expect(cookie.value).toBe('test-token');
      expect(cookie.maxAge).toBe(SESSION_TTL_SECONDS);
      expect(cookie.httpOnly).toBe(true);
      expect(cookie.secure).toBe(true);
      expect(cookie.sameSite).toBe('lax');
      expect(cookie.domain).toBe(SESSION_COOKIE_DOMAIN);
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
    it('attaches cookie to req.cookies and response headers', () => {
      const req = makeBunRequest('http://localhost:3001/auth/login');
      const res = Response.json({ ok: true });

      const updatedResponse = attachSessionCookie(req, res, 'token-123');

      expect(req.cookies.get(SESSION_COOKIE_NAME)).toBe('token-123');
      expect(updatedResponse.headers.get('Set-Cookie')).toContain('kana-session=token-123');
    });

    it('attaches cookie to response headers when req.cookies is not present', () => {
      const req = makeBunRequest('http://localhost:3001/auth/login');
      const res = Response.json({ ok: true });

      const updatedResponse = attachSessionCookie(req, res, 'token-123');

      expect(updatedResponse.headers.get('Set-Cookie')).toContain('kana-session=token-123');
    });
  });
});
