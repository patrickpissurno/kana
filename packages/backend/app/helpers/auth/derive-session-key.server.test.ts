import { describe, expect, it } from 'vitest';
import { SESSION_SECRET_SALT } from '../config.server';
import {
  AES_KEY_LENGTH,
  deriveSessionKey,
  PBKDF2_ITERATIONS,
  PBKDF2_SALT,
  sessionKey,
} from './derive-session-key.server';

const EXPECTED_PBKDF2_ITERATIONS = 200000;
const EXPECTED_AES_KEY_LENGTH = 256;
const TEST_SECRET_LENGTH = 32;
const TEST_SECRET = 'a'.repeat(TEST_SECRET_LENGTH);

describe('derive-session-key.server', () => {
  describe('constants', () => {
    it('exports expected cryptographic parameter constants', () => {
      const encoder = new TextEncoder();
      expect(PBKDF2_ITERATIONS).toBe(EXPECTED_PBKDF2_ITERATIONS);
      expect(AES_KEY_LENGTH).toBe(EXPECTED_AES_KEY_LENGTH);
      expect(PBKDF2_SALT).toEqual(encoder.encode(SESSION_SECRET_SALT));
    });
  });

  describe('deriveSessionKey', () => {
    it('derives an AES-GCM CryptoKey with encrypt and decrypt usages', async () => {
      const key = await deriveSessionKey(TEST_SECRET);

      expect(key.type).toBe('secret');
      expect(key.extractable).toBe(false);
      expect(key.algorithm).toMatchObject({
        name: 'AES-GCM',
        length: EXPECTED_AES_KEY_LENGTH,
      });
      expect(key.usages).toContain('encrypt');
      expect(key.usages).toContain('decrypt');
    });
  });

  describe('sessionKey', () => {
    it('exports initialized sessionKey derived from environment secret', () => {
      expect(sessionKey).toBeDefined();
      expect(sessionKey.type).toBe('secret');
      expect(sessionKey.extractable).toBe(false);
      expect(sessionKey.algorithm).toMatchObject({
        name: 'AES-GCM',
      });
    });
  });
});
