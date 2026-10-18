import type { User } from '@kana/helpers/auth/schemas';
import type { BunRequest } from 'bun';
import { Cookie } from 'bun';
import {
  DEVICE_COOKIE_MAX_AGE_SECONDS,
  DEVICE_ID_COOKIE_NAME,
  SESSION_COOKIE_DOMAIN,
  SESSION_COOKIE_NAME,
  SESSION_TTL_SECONDS,
  VITE_SESSION_COOKIE_DATA_NAME,
} from '../config.server';

export type SessionCookieData = {
  token: string;
  user: User;
};

export function getSessionCookie(req: BunRequest) {
  return req.cookies.get(SESSION_COOKIE_NAME) ?? undefined;
}

export function getDeviceIdCookie(req: BunRequest) {
  return req.cookies.get(DEVICE_ID_COOKIE_NAME) ?? undefined;
}

export function createDeviceIdCookie(deviceId: string): Cookie {
  return new Cookie(DEVICE_ID_COOKIE_NAME, deviceId, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: DEVICE_COOKIE_MAX_AGE_SECONDS,
    domain: SESSION_COOKIE_DOMAIN,
  });
}

export function attachDeviceIdCookie(req: BunRequest, res: Response, deviceId: string) {
  const deviceCookie = createDeviceIdCookie(deviceId);
  req.cookies.set(deviceCookie);
  res.headers.append('Set-Cookie', deviceCookie.serialize());
  return res;
}

export function createSessionCookie(data: SessionCookieData): [Cookie, Cookie] {
  const sessionCookie = new Cookie(SESSION_COOKIE_NAME, data.token, {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    domain: SESSION_COOKIE_DOMAIN,
  });

  const sessionDataCookie = new Cookie(VITE_SESSION_COOKIE_DATA_NAME, JSON.stringify(data.user), {
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    maxAge: SESSION_TTL_SECONDS,
    domain: SESSION_COOKIE_DOMAIN,
  });

  return [sessionCookie, sessionDataCookie];
}

export function attachSessionCookie(req: BunRequest, res: Response, data: SessionCookieData) {
  const [sessionCookie, sessionDataCookie] = createSessionCookie(data);
  req.cookies.set(sessionCookie);
  req.cookies.set(sessionDataCookie);
  res.headers.append('Set-Cookie', sessionCookie.serialize());
  res.headers.append('Set-Cookie', sessionDataCookie.serialize());
  return res;
}

export function createExpiredSessionCookie(): [Cookie, Cookie] {
  const sessionCookie = new Cookie(SESSION_COOKIE_NAME, '', {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    domain: SESSION_COOKIE_DOMAIN,
  });

  const sessionDataCookie = new Cookie(VITE_SESSION_COOKIE_DATA_NAME, '', {
    path: '/',
    httpOnly: false,
    secure: true,
    sameSite: 'lax',
    maxAge: 0,
    domain: SESSION_COOKIE_DOMAIN,
  });

  return [sessionCookie, sessionDataCookie];
}

export function deleteSessionCookie(req: BunRequest, res: Response) {
  const [sessionCookie, sessionDataCookie] = createExpiredSessionCookie();
  req.cookies.delete(SESSION_COOKIE_NAME, {
    path: '/',
    domain: SESSION_COOKIE_DOMAIN,
  });
  req.cookies.delete(VITE_SESSION_COOKIE_DATA_NAME, {
    path: '/',
    domain: SESSION_COOKIE_DOMAIN,
  });
  res.headers.append('Set-Cookie', sessionCookie.serialize());
  res.headers.append('Set-Cookie', sessionDataCookie.serialize());
  return res;
}
