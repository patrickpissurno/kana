import type { ServerResponse } from '@kana/helpers/types';
import { safeFetch } from '@kana/helpers/utils/safe-fetch';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { endpoint } from './endpoint';

vi.mock('@kana/helpers/utils/safe-fetch', () => ({
  safeFetch: vi.fn(),
}));

const STATUS_OK = 200;
const STATUS_BAD_REQUEST = 400;

describe('endpoint', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an endpoint wrapper that invokes fn and merges options with safeFetch init', async () => {
    type Props = { id: string };
    type Result = ServerResponse<{ ok: boolean }>;

    vi.mocked(safeFetch).mockResolvedValue({
      status: STATUS_OK,
      statusText: 'OK',
      headers: new Headers({ 'Content-Type': 'application/json' }),
      result: { data: { ok: true } },
      error: undefined,
    });

    const testEndpoint = endpoint<Props, Result>(async ({ f, props }) => {
      return f(`http://example.com/items/${props.id}`, {
        method: 'GET',
        headers: { 'X-Custom': '1' },
      });
    });

    const controller = new AbortController();
    const result = await testEndpoint({ id: 'item-123' }, { signal: controller.signal });

    expect(result).toEqual({ data: { ok: true } });
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
    type Result = ServerResponse<{ data: string }>;

    vi.mocked(safeFetch).mockResolvedValue({
      status: STATUS_OK,
      statusText: 'OK',
      headers: new Headers(),
      result: { data: { data: 'test' } },
      error: undefined,
    });

    const testEndpoint = endpoint<Props, Result>(async ({ f, props }) => {
      return f(`http://example.com/search?q=${props.query}`);
    });

    const result = await testEndpoint({ query: 'bun' });

    expect(result).toEqual({ data: { data: 'test' } });
    expect(safeFetch).toHaveBeenCalledWith(
      'http://example.com/search?q=bun',
      expect.objectContaining({})
    );
  });

  it('merges error from safeFetch when request fails', async () => {
    type Props = { id: string };
    type Result = ServerResponse<{ ok: boolean }>;

    vi.mocked(safeFetch).mockResolvedValue({
      status: STATUS_BAD_REQUEST,
      statusText: 'Bad Request',
      headers: new Headers(),
      result: undefined,
      error: { nonFieldError: 'Error occurred' },
    });

    const testEndpoint = endpoint<Props, Result>(async ({ f, props }) => {
      return f(`http://example.com/items/${props.id}`);
    });

    const result = await testEndpoint({ id: 'item-123' });

    expect(result).toEqual({ nonFieldError: 'Error occurred' });
  });
});
