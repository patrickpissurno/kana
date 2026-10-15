import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { makeBunRequest } from '~/mocks/bun/bun-request.mock';
import { INVALID_JSON_ERROR, parseJSONData } from './parse-json-data.server';

const testSchema = z.object({
  name: z.string().min(1),
  count: z.number().int().positive(),
});

describe('parseJSONData', () => {
  it('parses valid json matching schema', async () => {
    const payload = { name: 'Kana', count: 5 };
    const req = makeBunRequest('http://localhost:3001/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const result = await parseJSONData(req, testSchema);
    expect(result).toEqual({
      data: payload,
      error: undefined,
    });
  });

  it('returns validation error when json does not match schema', async () => {
    const payload = { name: '', count: -1 };
    const req = makeBunRequest('http://localhost:3001/sync', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const result = await parseJSONData(req, testSchema);
    expect(result.data).toBeUndefined();
    expect(result.error).toEqual({ fieldErrors: {} });
    expect(result.nonFieldError).toBeDefined();
  });

  it('returns invalid json error when body is malformed json', async () => {
    const req = makeBunRequest('http://localhost:3001/sync', {
      method: 'POST',
      body: 'not-valid-json',
    });

    const result = await parseJSONData(req, testSchema);
    expect(result).toEqual({
      data: undefined,
      error: { fieldErrors: {} },
      nonFieldError: INVALID_JSON_ERROR,
    });
  });

  it('returns invalid json error when req.text() rejects', async () => {
    const req = makeBunRequest('http://localhost:3001/sync', {
      method: 'POST',
    });
    req.text = async () => Promise.reject(new Error('Stream aborted'));

    const result = await parseJSONData(req, testSchema);
    expect(result).toEqual({
      data: undefined,
      error: { fieldErrors: {} },
      nonFieldError: INVALID_JSON_ERROR,
    });
  });
});
