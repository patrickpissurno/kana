import type { FetchResponse } from '@kana/helpers/utils/safe-fetch';
import { safeFetch } from '@kana/helpers/utils/safe-fetch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { endpoint } from './endpoint.server';

vi.mock('@kana/helpers/utils/safe-fetch', () => ({
  safeFetch: vi.fn(),
}));

const STATUS_OK = 200;

describe('endpoint.server', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an endpoint wrapper that invokes fn and merges options with safeFetch init', async () => {
    type Props = { id: string };
    type Result = { ok: boolean };

    const mockFetchResponse: FetchResponse<Result, unknown> = {
      status: STATUS_OK,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      result: { ok: true },
      error: undefined,
    };
    vi.mocked(safeFetch).mockResolvedValue(mockFetchResponse);

    const testEndpoint = endpoint<Props, Result, unknown>(async ({ safeFetch: client, props }) => {
      return client(`http://example.com/items/${props.id}`, {
        method: 'GET',
        headers: { 'X-Custom': '1' },
      });
    });

    const controller = new AbortController();
    const result = await testEndpoint({ id: 'item-123' }, { signal: controller.signal });

    expect(result.status).toBe(STATUS_OK);
    expect(result.result).toEqual({ ok: true });
    expect(safeFetch).toHaveBeenCalledWith(
      'http://example.com/items/item-123',
      expect.objectContaining({
        method: 'GET',
        headers: { 'X-Custom': '1' },
        signal: controller.signal,
      })
    );
  });

  it('works when options are omitted', async () => {
    type Props = { query: string };
    type Result = { data: string };

    const mockFetchResponse: FetchResponse<Result, unknown> = {
      status: STATUS_OK,
      statusText: 'OK',
      headers: new Headers(),
      result: { data: 'test' },
      error: undefined,
    };
    vi.mocked(safeFetch).mockResolvedValue(mockFetchResponse);

    const testEndpoint = endpoint<Props, Result, unknown>(async ({ safeFetch: client, props }) => {
      return client(`http://example.com/search?q=${props.query}`);
    });

    const result = await testEndpoint({ query: 'bun' });

    expect(result.status).toBe(STATUS_OK);
    expect(result.result).toEqual({ data: 'test' });
    expect(safeFetch).toHaveBeenCalledWith(
      'http://example.com/search?q=bun',
      expect.objectContaining({})
    );
  });
});
