import type { Serve } from 'bun';
import { attachCorsHeaders, handleCorsPreflight, isCorsAllowed } from './cors.server';
import { HTTP_UNSUPPORTED_MEDIA_TYPE, HTTP_FORBIDDEN } from './http-status.server';

const FORBIDDEN_RESPONSE = new Response(null, { status: HTTP_FORBIDDEN });
const UNSUPPORTED_MEDIA_TYPE_RESPONSE = new Response(null, { status: HTTP_UNSUPPORTED_MEDIA_TYPE });

export function wrapHandler(
  handler: (
    req: Bun.BunRequest,
    server: Bun.Server<undefined>
  ) => void | Response | Promise<void | Response | undefined>
) {
  return async (req: Bun.BunRequest, server: Bun.Server<undefined>) => {
    if (!isCorsAllowed(req)) {
      return FORBIDDEN_RESPONSE.clone();
    }

    const r = handler(req, server);

    if (typeof r === 'object' && 'catch' in r) {
      try {
        const res = await r;
        return res ? attachCorsHeaders(req, res) : res;
      } catch (err) {
        if (!err) {
          throw err;
        }

        if (err instanceof Response) {
          return attachCorsHeaders(req, err);
        }

        if (typeof err === 'object' && 'code' in err && err.code === 'ERR_FORMDATA_PARSE_ERROR') {
          return UNSUPPORTED_MEDIA_TYPE_RESPONSE.clone();
        }

        throw err;
      }
    }
    return r ? attachCorsHeaders(req, r) : r;
  };
}

export function defineRoutes<
  R extends string,
  const T extends Serve.Options<undefined, R>['routes'],
>(routes: T & Serve.Options<undefined, R>['routes']): T {
  if (!routes) {
    return routes;
  }

  const output: Record<string, unknown> = {};

  for (const key in routes) {
    const route = routes[key as R];

    if (typeof route === 'function') {
      output[key] = wrapHandler(route);
    } else if (
      typeof route === 'object' &&
      ('GET' in route ||
        'POST' in route ||
        'PUT' in route ||
        'DELETE' in route ||
        'PATCH' in route ||
        'HEAD' in route ||
        'OPTIONS' in route)
    ) {
      const wrapped = {} as Record<string, unknown>;
      output[key] = wrapped;

      for (const k in route) {
        const v = route[k as keyof typeof route];
        if (typeof v === 'function') {
          wrapped[k] = wrapHandler(v as never);
        } else {
          wrapped[k] = v;
        }
      }

      if (!('OPTIONS' in route)) {
        wrapped['OPTIONS'] = handleCorsPreflight;
      }
    } else {
      output[key] = route;
    }
  }

  return output as T;
}
