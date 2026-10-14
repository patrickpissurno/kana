import { describe, expect, it } from 'vitest';
import { schema, VITE_BACKEND_URL, VITE_SESSION_COOKIE_DATA_NAME } from './config';

describe('config', () => {
  describe('schema', () => {
    it('accepts valid config', () => {
      const parsed = schema.parse({
        VITE_BACKEND_URL: 'http://localhost:3001',
        VITE_SESSION_COOKIE_DATA_NAME: ' kana-session-data ',
      });
      expect(parsed.VITE_BACKEND_URL).toBe('http://localhost:3001');
      expect(parsed.VITE_SESSION_COOKIE_DATA_NAME).toBe('kana-session-data');
    });

    it('rejects missing or invalid config', () => {
      expect(schema.safeParse({}).success).toBe(false);
      expect(
        schema.safeParse({
          VITE_BACKEND_URL: 'not-a-url',
          VITE_SESSION_COOKIE_DATA_NAME: 'session-data',
        }).success
      ).toBe(false);
      expect(
        schema.safeParse({
          VITE_BACKEND_URL: 'http://localhost:3001',
          VITE_SESSION_COOKIE_DATA_NAME: '   ',
        }).success
      ).toBe(false);
    });
  });

  describe('exports', () => {
    it('exports parsed environment variables', () => {
      expect(VITE_BACKEND_URL).toBeDefined();
      expect(typeof VITE_BACKEND_URL).toBe('string');
      expect(VITE_SESSION_COOKIE_DATA_NAME).toBeDefined();
      expect(typeof VITE_SESSION_COOKIE_DATA_NAME).toBe('string');
    });
  });
});
