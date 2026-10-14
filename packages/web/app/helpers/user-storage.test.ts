import type { User } from '@kana/helpers/auth/schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { VITE_SESSION_COOKIE_DATA_NAME } from './config';
import { getStoredUser } from './user-storage';

const VALID_USER: User = {
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

describe('user-storage', () => {
  beforeEach(() => {
    clearCookies();
  });

  afterEach(() => {
    clearCookies();
  });

  describe('getStoredUser', () => {
    it('returns null when cookies are empty', () => {
      expect(getStoredUser()).toBeNull();
    });

    it('returns null when required cookie is not present', () => {
      document.cookie = 'other_cookie=value; Path=/';
      expect(getStoredUser()).toBeNull();
    });

    it('returns null when cookie contains malformed URI encoding', () => {
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=%E0%A4%A; Path=/`;
      expect(getStoredUser()).toBeNull();
    });

    it('returns null when cookie contains malformed JSON', () => {
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=not-valid-json{; Path=/`;
      expect(getStoredUser()).toBeNull();
    });

    it('returns null when cookie fails schema validation', () => {
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=${encodeURIComponent(JSON.stringify({ invalid: true }))}; Path=/`;
      expect(getStoredUser()).toBeNull();
    });

    it('returns valid user when cookie matches schema', () => {
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=${encodeURIComponent(JSON.stringify(VALID_USER))}; Path=/`;
      expect(getStoredUser()).toEqual(VALID_USER);
    });

    it('finds and parses user cookie when multiple cookies are present', () => {
      document.cookie = 'theme=dark; Path=/';
      document.cookie = `${VITE_SESSION_COOKIE_DATA_NAME}=${encodeURIComponent(JSON.stringify(VALID_USER))}; Path=/`;
      document.cookie = 'analytics=enabled; Path=/';
      expect(getStoredUser()).toEqual(VALID_USER);
    });
  });
});
