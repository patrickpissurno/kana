import type { BunRequest } from 'bun';
import { CookieMap } from 'bun';

export function makeBunRequest(input: RequestInfo | URL, init?: RequestInit): BunRequest {
  const cookies = new CookieMap();
  const base = new Request(input, init) as BunRequest;

  Object.assign(base, { cookies });

  return base;
}
