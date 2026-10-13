import { SESSION_SECRET, SESSION_SECRET_SALT } from '../config.server';

const encoder = new TextEncoder();

export const PBKDF2_ITERATIONS = 200000;
export const AES_KEY_LENGTH = 256;
export const PBKDF2_SALT = encoder.encode(SESSION_SECRET_SALT);

export async function deriveSessionKey(secret: string): Promise<CryptoKey> {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: PBKDF2_SALT,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: AES_KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

export const sessionKey = await deriveSessionKey(SESSION_SECRET);
