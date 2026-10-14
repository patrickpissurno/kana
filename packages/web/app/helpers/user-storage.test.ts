import type { User } from '@kana/helpers/auth/schemas';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { clearStoredUser, getStoredUser, setStoredUser, USER_STORAGE_KEY } from './user-storage';

const VALID_USER: User = {
  email: 'test@example.com',
  name: 'Test User',
  expires_at: '2026-10-14T00:00:00.000Z',
};

describe('user-storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('getStoredUser', () => {
    it('returns null when storage item does not exist', () => {
      expect(getStoredUser()).toBeNull();
    });

    it('returns null when storage item contains malformed JSON', () => {
      localStorage.setItem(USER_STORAGE_KEY, 'not-valid-json{');
      expect(getStoredUser()).toBeNull();
    });

    it('returns null when storage item fails schema validation', () => {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify({ invalid: true }));
      expect(getStoredUser()).toBeNull();
    });

    it('returns valid user when storage item matches schema', () => {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(VALID_USER));
      expect(getStoredUser()).toEqual(VALID_USER);
    });
  });

  describe('setStoredUser', () => {
    it('serializes and stores valid user in localStorage', () => {
      setStoredUser(VALID_USER);
      expect(localStorage.getItem(USER_STORAGE_KEY)).toBe(JSON.stringify(VALID_USER));
    });

    it('throws error when user object does not match schema', () => {
      expect(() => {
        setStoredUser({ email: 'invalid-email', name: 'Test' });
      }).toThrow();
    });
  });

  describe('clearStoredUser', () => {
    it('removes user item from localStorage', () => {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(VALID_USER));
      expect(localStorage.getItem(USER_STORAGE_KEY)).not.toBeNull();

      clearStoredUser();
      expect(localStorage.getItem(USER_STORAGE_KEY)).toBeNull();
    });
  });
});
