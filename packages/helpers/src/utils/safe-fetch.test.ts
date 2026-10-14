import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { safeFetch } from './safe-fetch';

const STATUS_SWITCHING = 101;
const STATUS_OK = 200;
const STATUS_FOUND = 302;
const STATUS_BAD_REQUEST = 400;
const STATUS_INTERNAL_ERROR = 500;

describe('safeFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed json on successful 2xx response', async () => {
    const payload = { message: 'success' };
    const mockResponse = new Response(JSON.stringify(payload), {
      status: STATUS_OK,
      statusText: 'OK',
      headers: { 'Content-Type': 'application/json' },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const response = await safeFetch<typeof payload, unknown>('http://example.com/api');

    expect(response.status).toBe(STATUS_OK);
    expect(response.statusText).toBe('OK');
    expect(response.result).toEqual(payload);
    expect(response.error).toBeUndefined();
  });

  it('returns plain text on 2xx response when json parsing fails', async () => {
    const mockResponse = new Response('plain text response', {
      status: STATUS_OK,
      statusText: 'OK',
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const response = await safeFetch<string, unknown>('http://example.com/api');

    expect(response.status).toBe(STATUS_OK);
    expect(response.result).toBe('plain text response');
    expect(response.error).toBeUndefined();
  });

  it('handles response.text() rejection gracefully', async () => {
    const mockResponse = {
      status: STATUS_OK,
      statusText: 'OK',
      headers: new Headers(),
      text: vi.fn().mockRejectedValue(new Error('stream error')),
    } as unknown as Response;
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const response = await safeFetch<undefined, unknown>('http://example.com/api');

    expect(response.status).toBe(STATUS_OK);
    expect(response.result).toBeUndefined();
    expect(response.error).toBeUndefined();
  });

  it('returns undefined result and error for 1xx info responses', async () => {
    const mockResponse = new Response(null, {
      status: STATUS_SWITCHING,
      statusText: 'Continue',
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const response = await safeFetch('http://example.com/api');

    expect(response.status).toBe(STATUS_SWITCHING);
    expect(response.result).toBeUndefined();
    expect(response.error).toBeUndefined();
  });

  it('returns undefined result and error for 3xx redirect responses', async () => {
    const mockResponse = new Response(null, {
      status: STATUS_FOUND,
      statusText: 'Found',
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const response = await safeFetch('http://example.com/api');

    expect(response.status).toBe(STATUS_FOUND);
    expect(response.result).toBeUndefined();
    expect(response.error).toBeUndefined();
  });

  it('returns parsed error for 4xx client error responses', async () => {
    const errorPayload = { error: 'Invalid parameter' };
    const mockResponse = new Response(JSON.stringify(errorPayload), {
      status: STATUS_BAD_REQUEST,
      statusText: 'Bad Request',
      headers: { 'Content-Type': 'application/json' },
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const response = await safeFetch<unknown, typeof errorPayload>('http://example.com/api');

    expect(response.status).toBe(STATUS_BAD_REQUEST);
    expect(response.result).toBeUndefined();
    expect(response.error).toEqual(errorPayload);
  });

  it('returns text error for 5xx server error responses', async () => {
    const mockResponse = new Response('Server Error', {
      status: STATUS_INTERNAL_ERROR,
      statusText: 'Internal Server Error',
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const response = await safeFetch<unknown, string>('http://example.com/api');

    expect(response.status).toBe(STATUS_INTERNAL_ERROR);
    expect(response.result).toBeUndefined();
    expect(response.error).toBe('Server Error');
  });

  it('returns response.body stream when asStream is true on 2xx response', async () => {
    const stream = new ReadableStream();
    const mockResponse = new Response(stream, {
      status: STATUS_OK,
      statusText: 'OK',
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse);

    const response = await safeFetch<ReadableStream, unknown>('http://example.com/api', {
      asStream: true,
    });

    expect(response.status).toBe(STATUS_OK);
    expect(response.result).toBe(mockResponse.body);
    expect(response.error).toBeUndefined();
  });
});
