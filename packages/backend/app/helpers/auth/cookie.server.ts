import type { BunRequest } from 'bun';
import { Cookie } from 'bun';
import { SESSION_COOKIE_DOMAIN, SESSION_COOKIE_NAME, SESSION_TTL_SECONDS } from '../config.server';

export function getSessionCookie(req: BunRequest) {
  return req.cookies.get(SESSION_COOKIE_NAME) ?? undefined;
}

export function createSessionCookie(token: string) {
  return new Cookie(SESSION_COOKIE_NAME, token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    domain: SESSION_COOKIE_DOMAIN,
  });
}

export function attachSessionCookie(req: BunRequest, res: Response, token: string) {
  const cookie = createSessionCookie(token);
  req.cookies.set(cookie);
  res.headers.append('Set-Cookie', cookie.serialize());
  return res;
}
