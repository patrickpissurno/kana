import type { TokenData } from './schemas.server';
import { AES_GCM_IV_LENGTH } from '../config.server';
import { sessionKey } from './derive-session-key.server';

const encoder = new TextEncoder();

export async function createToken(data: TokenData): Promise<string> {
  const payloadJson = JSON.stringify(data);
  const iv = crypto.getRandomValues(new Uint8Array(AES_GCM_IV_LENGTH));
  const plaintext = encoder.encode(payloadJson);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sessionKey, plaintext);

  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return Buffer.from(combined).toString('base64');
}
