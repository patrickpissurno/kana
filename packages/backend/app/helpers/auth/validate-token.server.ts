import type { TokenData } from './schemas.server';
import { AES_GCM_IV_LENGTH } from '../config.server';
import { sessionKey } from './derive-session-key.server';
import { tokenDataSchema } from './schemas.server';

const decoder = new TextDecoder();

export async function validateToken(token: string): Promise<TokenData | null> {
  if (!token) {
    return null;
  }

  try {
    const buffer = Buffer.from(token, 'base64');
    if (buffer.length <= AES_GCM_IV_LENGTH) {
      return null;
    }

    const iv = buffer.subarray(0, AES_GCM_IV_LENGTH);
    const ciphertext = buffer.subarray(AES_GCM_IV_LENGTH);

    const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sessionKey, ciphertext);

    const decodedText = decoder.decode(decrypted);

    const parsed = tokenDataSchema.safeParse(JSON.parse(decodedText));
    if (!parsed.success) {
      return null;
    }

    const expiresAtMs = Date.parse(parsed.data.expires_at);
    if (expiresAtMs <= Date.now()) {
      return null;
    }

    return parsed.data;
  } catch {
    return null;
  }
}
