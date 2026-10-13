import { describe, expect, it } from 'vitest';
import { makeBunRequest } from '~/mocks/bun/bun-request.mock';
import { CORS_VALID_ORIGINS } from './config.server';
import { handleCorsPreflight } from './cors.server';
import { defineRoutes, wrapHandler } from './define-routes.server';
import { HTTP_FORBIDDEN, HTTP_OK, HTTP_UNSUPPORTED_MEDIA_TYPE } from './http-status.server';

const VALID_ORIGIN = CORS_VALID_ORIGINS.at(0)!;
const INVALID_ORIGIN = 'https://unauthorized.domain.com';
const TEST_URL = 'http://localhost/test';
const mockServer = {} as unknown as Bun.Server<undefined>;

async function rejectWith<T>(reason: unknown): Promise<T> {
  await Promise.resolve();
  return new Promise((_resolve, reject) => {
    Reflect.apply(reject, undefined, [reason]);
  });
}

describe('define-routes.server', () => {
  describe('wrapHandler', () => {
    it('returns 403 when CORS is not allowed', async () => {
      const handler = wrapHandler(() => new Response('ok'));
      const req = makeBunRequest(TEST_URL);
      req.headers.set('Origin', INVALID_ORIGIN);

      const res = (await handler(req, mockServer)) as Response;
      expect(res.status).toBe(HTTP_FORBIDDEN);
    });

    it('handles synchronous handler returning a Response', async () => {
      const handler = wrapHandler(() => new Response('sync-ok'));
      const req = makeBunRequest(TEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);

      const res = (await handler(req, mockServer)) as Response;
      expect(res.status).toBe(HTTP_OK);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(VALID_ORIGIN);
    });

    it('handles synchronous handler returning undefined', async () => {
      const handler = wrapHandler(() => undefined);
      const req = makeBunRequest(TEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);

      const res = await handler(req, mockServer);
      expect(res).toBeUndefined();
    });

    it('handles asynchronous handler resolving a Response', async () => {
      const handler = wrapHandler(async () => Promise.resolve(new Response('async-ok')));
      const req = makeBunRequest(TEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);

      const res = (await handler(req, mockServer)) as Response;
      expect(res.status).toBe(HTTP_OK);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(VALID_ORIGIN);
    });

    it('handles asynchronous handler resolving undefined', async () => {
      const handler = wrapHandler(async () => Promise.resolve(undefined));
      const req = makeBunRequest(TEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);

      const res = await handler(req, mockServer);
      expect(res).toBeUndefined();
    });

    it('re-throws falsy error when asynchronous handler rejects with falsy value', async () => {
      const handler = wrapHandler(async () => {
        await Promise.resolve();
        return rejectWith<Response>(null);
      });
      const req = makeBunRequest(TEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);

      await expect(handler(req, mockServer)).rejects.toBeNull();
    });

    it('handles asynchronous handler rejecting with a Response', async () => {
      const thrownRes = new Response('rejected-response', { status: HTTP_FORBIDDEN });
      const handler = wrapHandler(async () => {
        await Promise.resolve();
        throw thrownRes;
      });
      const req = makeBunRequest(TEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);

      const res = (await handler(req, mockServer)) as Response;
      expect(res.status).toBe(HTTP_FORBIDDEN);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(VALID_ORIGIN);
    });

    it('handles asynchronous handler rejecting with ERR_FORMDATA_PARSE_ERROR', async () => {
      const parseError = Object.assign(new Error('Parse error'), {
        code: 'ERR_FORMDATA_PARSE_ERROR',
      });
      const handler = wrapHandler(async () => {
        await Promise.resolve();
        throw parseError;
      });
      const req = makeBunRequest(TEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);

      const res = (await handler(req, mockServer)) as Response;
      expect(res.status).toBe(HTTP_UNSUPPORTED_MEDIA_TYPE);
    });

    it('re-throws unexpected error when asynchronous handler rejects with standard Error', async () => {
      const error = new Error('unexpected error');
      const handler = wrapHandler(async () => {
        await Promise.resolve();
        throw error;
      });
      const req = makeBunRequest(TEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);

      await expect(handler(req, mockServer)).rejects.toThrow('unexpected error');
    });
  });

  describe('defineRoutes', () => {
    it('returns falsy routes argument unchanged', () => {
      const routes = defineRoutes(undefined as never);
      expect(routes).toBeUndefined();
    });

    it('wraps a route that is a function', async () => {
      const routes = defineRoutes({
        '/function-route': async (_req: Bun.BunRequest, _server: Bun.Server<undefined>) =>
          Promise.resolve(new Response('fn-ok')),
      });
      const req = makeBunRequest(TEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);

      const handler = routes['/function-route'];
      const res = await handler(req, mockServer);
      expect(res.status).toBe(HTTP_OK);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(VALID_ORIGIN);
    });

    it('wraps method functions, preserves non-function values, and injects default OPTIONS', () => {
      const staticResponse = new Response('static-ok');
      const routes = defineRoutes({
        '/api': {
          GET: () => new Response('get-ok'),
          POST: staticResponse,
        },
      });

      const route = routes['/api'];
      expect(route.POST).toBe(staticResponse);
      const injectedOptions = (route as unknown as { OPTIONS?: unknown }).OPTIONS;
      expect(injectedOptions).toBe(handleCorsPreflight);
      expect(typeof route.GET).toBe('function');
    });

    it('supports all HTTP method branches when defining routes', () => {
      const postRoutes = defineRoutes({ '/p': { POST: () => new Response('p') } });
      const putRoutes = defineRoutes({ '/pu': { PUT: () => new Response('pu') } });
      const deleteRoutes = defineRoutes({ '/d': { DELETE: () => new Response('d') } });
      const patchRoutes = defineRoutes({ '/pa': { PATCH: () => new Response('pa') } });
      const headRoutes = defineRoutes({ '/h': { HEAD: () => new Response('h') } });
      const optionsRoutes = defineRoutes({ '/o': { OPTIONS: () => new Response('o') } });

      expect(typeof postRoutes['/p'].POST).toBe('function');
      expect(typeof putRoutes['/pu'].PUT).toBe('function');
      expect(typeof deleteRoutes['/d'].DELETE).toBe('function');
      expect(typeof patchRoutes['/pa'].PATCH).toBe('function');
      expect(typeof headRoutes['/h'].HEAD).toBe('function');
      expect(typeof optionsRoutes['/o'].OPTIONS).toBe('function');
    });

    it('preserves route objects without recognized HTTP methods', () => {
      const customObject = { customProperty: 'value' };
      const routes = defineRoutes({
        '/custom': customObject as never,
      });

      expect(routes['/custom']).toBe(customObject);
    });

    it('preserves route values that are neither functions nor objects', () => {
      const nonMethodLiteral = 'static-string';
      const routes = defineRoutes({
        '/literal': nonMethodLiteral as never,
      });

      expect(routes['/literal']).toBe(nonMethodLiteral);
    });
  });
});
