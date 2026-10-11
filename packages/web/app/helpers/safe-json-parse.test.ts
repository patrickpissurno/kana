import { describe, expect, it } from 'vitest';
import { safeJSONParse } from './safe-json-parse';

describe('safeJSONParse', () => {
  it('parses valid JSON string', () => {
    const data = { key: 'value', count: 42 };
    const result = safeJSONParse(JSON.stringify(data), null);
    expect(result).toEqual(data);
  });

  it('returns fallback value on invalid JSON string', () => {
    const fallback = { fallback: true };
    const result = safeJSONParse('invalid-json{', fallback);
    expect(result).toBe(fallback);
  });
});
