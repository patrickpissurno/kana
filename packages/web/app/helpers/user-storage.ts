import type { User } from '@kana/helpers/auth/schemas';
import { userSchema } from '@kana/helpers/auth/schemas';
import { safeJSONParse } from '@kana/helpers/utils/safe-json-parse';

export const USER_STORAGE_KEY = 'user';

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  const parsed = safeJSONParse(raw, null);
  if (!parsed) {
    return null;
  }

  const result = userSchema.safeParse(parsed);
  if (!result.success) {
    return null;
  }

  return result.data;
}

export function setStoredUser(user: User): void {
  const validated = userSchema.parse(user);
  localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(validated));
}

export function clearStoredUser(): void {
  localStorage.removeItem(USER_STORAGE_KEY);
}
