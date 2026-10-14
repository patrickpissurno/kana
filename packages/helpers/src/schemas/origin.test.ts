import { describe, expect, it } from 'vitest';
import { originSchema } from './origin';

describe('originSchema', () => {
  it('accepts valid http and https origins with trimming', () => {
    expect(originSchema.parse('  http://localhost:3000  ')).toBe('http://localhost:3000');
    expect(originSchema.parse('https://example.com')).toBe('https://example.com');
  });

  it('rejects invalid origins', () => {
    expect(originSchema.safeParse('').success).toBe(false);
    expect(originSchema.safeParse('ftp://example.com').success).toBe(false);
    expect(originSchema.safeParse('http://').success).toBe(false);
  });
});
