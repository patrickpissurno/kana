import type { PublicSessionData } from '@kana/helpers/auth/schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VITE_SESSION_COOKIE_DATA_NAME } from './config';
import { getSessionData } from './session-data-storage';

const VALID_SESSION_DATA: PublicSessionData = {
  email: 'test@example.com',
  name: 'Test User',
  expires_at: '2026-10-14T00:00:00.000Z',
};

function clearCookies() {
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const eqPos = cookie.indexOf('=');
    const name = eqPos > -1 ? cookie.slice(0, eqPos).trim() : cookie.trim();
    if (name) {
      document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
    }
  }
}

describe('session-data-storage', () => {
  beforeEach(() => {
    clearCookies();
  });

  afterEach(() => {
    clearCookies();
  });

  describe('getSessionData', () => {
    it('returns null when cookies are empty', () => {
      expect(getSessionData()).toBeNull();
    });

    it('returns null when required cookie is not present', () => {
      document.cookie = 'other_cookie=value; Path=/';
      expect(getSessionData()).toBeNull();
    });

    it('returns null when cookie contains malformed URI encoding', () => {
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=%E0%A4%A; Path=/`;
      expect(getSessionData()).toBeNull();
    });

    it('returns null when cookie contains malformed JSON', () => {
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=not-valid-json{; Path=/`;
      expect(getSessionData()).toBeNull();
    });

    it('returns null when cookie fails schema validation', () => {
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=${encodeURIComponent(JSON.stringify({ invalid: true }))}; Path=/`;
      expect(getSessionData()).toBeNull();
    });

    it('returns valid session data when cookie matches schema', () => {
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=${encodeURIComponent(JSON.stringify(VALID_SESSION_DATA))}; Path=/`;
      expect(getSessionData()).toEqual(VALID_SESSION_DATA);
    });

    it('finds and parses user cookie when multiple cookies are present', () => {
      document.cookie = 'theme=dark; Path=/';
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=${encodeURIComponent(JSON.stringify(VALID_SESSION_DATA))}; Path=/`;
      document.cookie = 'analytics=enabled; Path=/';
      expect(getSessionData()).toEqual(VALID_SESSION_DATA);
    });
  });
});
