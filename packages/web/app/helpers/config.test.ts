import { describe, expect, it } from 'vitest';
import { schema, VITE_BACKEND_URL } from './config';

describe('config', () => {
  describe('schema', () => {
    it('accepts valid backend url', () => {
      const parsed = schema.parse({ VITE_BACKEND_URL: 'http://localhost:3001' });
      expect(parsed.VITE_BACKEND_URL).toBe('http://localhost:3001');
    });

    it('rejects missing or invalid backend url', () => {
      expect(schema.safeParse({}).success).toBe(false);
      expect(schema.safeParse({ VITE_BACKEND_URL: 'not-a-url' }).success).toBe(false);
    });
  });

  describe('VITE_BACKEND_URL', () => {
    it('exports parsed VITE_BACKEND_URL', () => {
      expect(VITE_BACKEND_URL).toBeDefined();
      expect(typeof VITE_BACKEND_URL).toBe('string');
    });
  });
});
