import { describe, expect, it } from 'vitest';
import { makeBunRequest } from '~/mocks/bun/bun-request.mock';
import { CORS_MAX_AGE_SECONDS, CORS_VALID_ORIGINS } from './config.server';
import { attachCorsHeaders, handleCorsPreflight, isCorsAllowed } from './cors.server';
import { HTTP_FORBIDDEN, HTTP_NO_CONTENT } from './http-status.server';

const VALID_ORIGIN = CORS_VALID_ORIGINS.at(0)!;
const INVALID_ORIGIN = 'https://unauthorized.domain.com';
const REQUEST_URL = 'http://localhost/test';
const EXPECTED_METHODS = 'OPTIONS,GET,POST,PUT,PATCH,DELETE';
const EXPECTED_HEADERS = 'Content-Type,Cookie';
const EXPECTED_CREDENTIALS = 'true';
const EXPECTED_MAX_AGE = CORS_MAX_AGE_SECONDS.toString();
const EXPECTED_VARY = 'Origin';

describe('cors.server', () => {
  describe('isCorsAllowed', () => {
    it('returns false when Origin header is missing', () => {
      const req = makeBunRequest(REQUEST_URL);
      expect(isCorsAllowed(req)).toBe(false);
    });

    it('returns false when Origin is disallowed', () => {
      const req = makeBunRequest(REQUEST_URL);
      req.headers.set('Origin', INVALID_ORIGIN);
      expect(isCorsAllowed(req)).toBe(false);
    });

    it('returns true when Origin is valid', () => {
      const req = makeBunRequest(REQUEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);
      expect(isCorsAllowed(req)).toBe(true);
    });
  });

  describe('attachCorsHeaders', () => {
    it('returns unmodified response when Origin header is missing', () => {
      const req = makeBunRequest(REQUEST_URL);
      const res = new Response(null);
      const result = attachCorsHeaders(req, res);

      expect(result.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('returns unmodified response when Origin is disallowed', () => {
      const req = makeBunRequest(REQUEST_URL);
      req.headers.set('Origin', INVALID_ORIGIN);
      const res = new Response(null);
      const result = attachCorsHeaders(req, res);

      expect(result.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });

    it('attaches CORS headers when Origin is valid', () => {
      const req = makeBunRequest(REQUEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);
      const res = new Response(null);
      const result = attachCorsHeaders(req, res);

      expect(result.headers.get('Access-Control-Allow-Origin')).toBe(VALID_ORIGIN);
      expect(result.headers.get('Access-Control-Allow-Methods')).toBe(EXPECTED_METHODS);
      expect(result.headers.get('Access-Control-Allow-Headers')).toBe(EXPECTED_HEADERS);
      expect(result.headers.get('Access-Control-Allow-Credentials')).toBe(EXPECTED_CREDENTIALS);
      expect(result.headers.get('Access-Control-Max-Age')).toBe(EXPECTED_MAX_AGE);
      expect(result.headers.get('Vary')).toBe(EXPECTED_VARY);
    });
  });

  describe('handleCorsPreflight', () => {
    it('returns 403 when Origin header is missing', () => {
      const req = makeBunRequest(REQUEST_URL);
      const res = handleCorsPreflight(req);

      expect(res.status).toBe(HTTP_FORBIDDEN);
    });

    it('returns 403 when Origin is disallowed', () => {
      const req = makeBunRequest(REQUEST_URL);
      req.headers.set('Origin', INVALID_ORIGIN);
      const res = handleCorsPreflight(req);

      expect(res.status).toBe(HTTP_FORBIDDEN);
    });

    it('returns 204 with CORS headers when Origin is valid', () => {
      const req = makeBunRequest(REQUEST_URL);
      req.headers.set('Origin', VALID_ORIGIN);
      const res = handleCorsPreflight(req);

      expect(res.status).toBe(HTTP_NO_CONTENT);
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe(VALID_ORIGIN);
    });
  });
});
