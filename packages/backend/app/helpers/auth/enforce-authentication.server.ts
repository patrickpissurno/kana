import type { BunRequest } from 'bun';
import { HTTP_UNAUTHORIZED } from '../http-status.server';
import { getSessionCookie } from './cookie.server';
import { validateToken } from './validate-token.server';

export async function enforceAuthentication(req: BunRequest) {
  const token = getSessionCookie(req);
  if (!token) {
    throw new Response(null, { status: HTTP_UNAUTHORIZED });
  }

  const data = await validateToken(token);
  if (!data) {
    throw new Response(null, { status: HTTP_UNAUTHORIZED });
  }

  return data;
}
