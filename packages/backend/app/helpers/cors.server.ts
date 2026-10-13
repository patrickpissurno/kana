import type { BunRequest } from 'bun';
import { CORS_MAX_AGE_SECONDS, CORS_VALID_ORIGINS } from './config.server';
import { HTTP_FORBIDDEN, HTTP_NO_CONTENT } from './http-status.server';

const ALLOWED_ORIGINS = new Set(CORS_VALID_ORIGINS);

const ALLOWED_METHODS = ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'].join(',');
const ALLOWED_HEADERS = ['Content-Type', 'Cookie'].join(',');

export function isCorsAllowed(req: BunRequest): boolean {
  const origin = req.headers.get('Origin');
  return origin !== null && ALLOWED_ORIGINS.has(origin);
}

export function attachCorsHeaders(req: BunRequest, res: Response) {
  const origin = req.headers.get('Origin');

  if (origin && isCorsAllowed(req)) {
    res.headers.set('Access-Control-Allow-Origin', origin);
    res.headers.set('Access-Control-Allow-Methods', ALLOWED_METHODS);
    res.headers.set('Access-Control-Allow-Headers', ALLOWED_HEADERS);
    res.headers.set('Access-Control-Allow-Credentials', 'true');
    res.headers.set('Access-Control-Max-Age', CORS_MAX_AGE_SECONDS.toString());
    res.headers.set('Vary', 'Origin');
  }

  return res;
}

export function handleCorsPreflight(req: BunRequest) {
  const origin = req.headers.get('Origin');

  if (!origin || !isCorsAllowed(req)) {
    return new Response(null, { status: HTTP_FORBIDDEN });
  }

  const res = new Response(null, {
    status: HTTP_NO_CONTENT,
  });

  attachCorsHeaders(req, res);

  return res;
}
