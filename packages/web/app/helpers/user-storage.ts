import type { PublicSessionData } from '@kana/helpers/auth/schemas';
import { publicSessionDataSchema } from '@kana/helpers/auth/schemas';
import { safeJSONParse } from '@kana/helpers/utils/safe-json-parse';
import { VITE_SESSION_COOKIE_DATA_NAME } from './config';

export function getStoredUser(): PublicSessionData | null {
  const prefix = `${VITE_SESSION_COOKIE_DATA_NAME}=`;
  const found = document.cookie
    .split(';')
    .map((c) => c.trim())
    .find((c) => c.startsWith(prefix));

  if (!found) {
    return null;
  }

  const raw = found.slice(prefix.length);
  let decoded = '';
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    return null;
  }

  const parsed = safeJSONParse(decoded, null);
  if (!parsed) {
    return null;
  }

  const result = publicSessionDataSchema.safeParse(parsed);
  if (!result.success) {
    return null;
  }

  return result.data;
}
